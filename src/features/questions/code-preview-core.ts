import { parse } from '@babel/parser';

import type {
  ChallengeRequirement,
  CodeFile,
  CustomValidatorRegistry,
  RenderNode,
  RenderValidationRule,
  RuleOutcome,
} from './questions.types';

const SUPPORTED_COMPONENTS = new Set([
  'View', 'Text', 'Image', 'Pressable', 'TextInput', 'ScrollView', 'SafeAreaView',
]);
const MAX_NODES = 100;
const MAX_DEPTH = 12;

export type CodePreviewResult = {
  tree?: RenderNode;
  errors: string[];
};

class PreviewParseError extends Error {
  constructor(message: string, node?: { loc?: { start?: { line?: number; column?: number } } }) {
    const line = node?.loc?.start?.line;
    const column = node?.loc?.start?.column;
    super(line ? `${message} (line ${line}${column === undefined ? '' : `, column ${column + 1}`})` : message);
  }
}

type AstNode = Record<string, unknown> & {
  type: string;
  loc?: { start?: { line?: number; column?: number } };
};

function isNode(value: unknown): value is AstNode {
  return Boolean(value && typeof value === 'object' && 'type' in value);
}

function nodeName(node: AstNode): string {
  const name = node.name;
  if (typeof name === 'string') return name;
  throw new PreviewParseError('Only simple component names are supported', node);
}

function literalValue(node: unknown): string | number | boolean | null | Record<string, unknown> {
  if (!isNode(node)) throw new PreviewParseError('Only static prop values are supported');
  if (node.type === 'StringLiteral' || node.type === 'NumericLiteral' || node.type === 'BooleanLiteral') {
    return node.value as string | number | boolean;
  }
  if (node.type === 'NullLiteral') return null;
  if (node.type === 'UnaryExpression' && node.operator === '-' && isNode(node.argument) && node.argument.type === 'NumericLiteral') {
    return -(node.argument.value as number);
  }
  if (node.type === 'ObjectExpression') {
    const output: Record<string, unknown> = {};
    for (const property of (node.properties as unknown[] | undefined) ?? []) {
      if (!isNode(property) || property.type !== 'ObjectProperty' || property.computed) {
        throw new PreviewParseError('Spread and computed object properties are not supported', isNode(property) ? property : node);
      }
      if (!isNode(property.key)) throw new PreviewParseError('Invalid object key', property);
      const key = property.key.type === 'Identifier' || property.key.type === 'StringLiteral'
        ? String(property.key.name ?? property.key.value)
        : '';
      if (!key) throw new PreviewParseError('Only identifier and string object keys are supported', property.key);
      output[key] = literalValue(property.value);
    }
    return output;
  }
  throw new PreviewParseError('Dynamic expressions are not supported in the preview', node);
}

function findReturnedJsx(program: AstNode): AstNode | undefined {
  const body = (program.body as unknown[] | undefined) ?? [];
  const exportNode = body.find((item) => isNode(item) && item.type === 'ExportDefaultDeclaration');
  if (!isNode(exportNode) || !isNode(exportNode.declaration)) return undefined;
  const declaration = exportNode.declaration;
  const functionBody = declaration.type === 'FunctionDeclaration'
    ? declaration.body
    : declaration.type === 'ArrowFunctionExpression' || declaration.type === 'FunctionExpression'
      ? declaration.body
      : undefined;
  if (!isNode(functionBody)) return undefined;
  if (functionBody.type === 'JSXElement') return functionBody;
  if (functionBody.type !== 'BlockStatement') return undefined;

  const stack = [...((functionBody.body as unknown[] | undefined) ?? [])];
  while (stack.length) {
    const current = stack.shift();
    if (!isNode(current)) continue;
    if (current.type === 'ReturnStatement' && isNode(current.argument) && current.argument.type === 'JSXElement') {
      return current.argument;
    }
    if (current.type === 'IfStatement') {
      if (current.consequent) stack.push(current.consequent);
      if (current.alternate) stack.push(current.alternate);
    }
    if (current.type === 'BlockStatement') stack.push(...((current.body as unknown[] | undefined) ?? []));
  }
  return undefined;
}

function convertJsx(node: AstNode, depth: number, count: { value: number }): RenderNode {
  if (depth > MAX_DEPTH) throw new PreviewParseError(`Preview nesting is limited to ${MAX_DEPTH} levels`, node);
  count.value += 1;
  if (count.value > MAX_NODES) throw new PreviewParseError(`Preview is limited to ${MAX_NODES} components`, node);
  if (node.type !== 'JSXElement' || !isNode(node.openingElement) || !isNode(node.openingElement.name)) {
    throw new PreviewParseError('Expected a JSX component', node);
  }

  const component = nodeName(node.openingElement.name);
  if (!SUPPORTED_COMPONENTS.has(component)) {
    throw new PreviewParseError(`${component} is not supported in this preview`, node.openingElement.name);
  }

  const props: Record<string, unknown> = {};
  let style: RenderNode['style'];
  for (const attribute of (node.openingElement.attributes as unknown[] | undefined) ?? []) {
    if (!isNode(attribute) || attribute.type !== 'JSXAttribute' || !isNode(attribute.name)) {
      throw new PreviewParseError('Spread props are not supported', isNode(attribute) ? attribute : node);
    }
    const name = nodeName(attribute.name);
    if (/^on[A-Z]/.test(name)) throw new PreviewParseError('Event handlers are not allowed in previews', attribute);
    const rawValue = attribute.value;
    let value: unknown = true;
    if (isNode(rawValue) && rawValue.type === 'StringLiteral') value = rawValue.value;
    else if (isNode(rawValue) && rawValue.type === 'JSXExpressionContainer') value = literalValue(rawValue.expression);
    else if (rawValue != null) throw new PreviewParseError('Only literal prop values are supported', attribute);
    if (name === 'style') style = value as RenderNode['style'];
    else props[name] = value;
  }

  const children: RenderNode[] = [];
  let text = '';
  for (const child of (node.children as unknown[] | undefined) ?? []) {
    if (!isNode(child)) continue;
    if (child.type === 'JSXText') {
      const value = String(child.value ?? '').replace(/\s+/g, ' ').trim();
      if (value) text += `${text ? ' ' : ''}${value}`;
    } else if (child.type === 'JSXElement') {
      children.push(convertJsx(child, depth + 1, count));
    } else if (child.type === 'JSXExpressionContainer' && isNode(child.expression)) {
      const value = literalValue(child.expression);
      if (typeof value === 'string' || typeof value === 'number') text += String(value);
      else throw new PreviewParseError('Only string and number expressions can be rendered as text', child);
    }
  }

  return {
    component,
    ...(Object.keys(props).length ? { props } : {}),
    ...(style ? { style } : {}),
    ...(text ? { text } : {}),
    ...(children.length ? { children } : {}),
  };
}

export function parseCodeToRenderTree(source: string, language: CodeFile['language'] = 'tsx'): CodePreviewResult {
  try {
    if (language === 'json') return { errors: ['JSON files cannot be rendered as JSX.'] };
    const ast = parse(source, {
      sourceType: 'module',
      plugins: language === 'typescript' || language === 'tsx' ? ['typescript', 'jsx'] : ['jsx'],
    }) as unknown as { program: AstNode };
    const returned = findReturnedJsx(ast.program);
    if (!returned) return { errors: ['Add a default component that returns JSX.'] };
    return { tree: convertJsx(returned, 1, { value: 0 }), errors: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to parse this file.';
    return { errors: [message] };
  }
}

export function renderTreesEqual(left?: RenderNode, right?: RenderNode): boolean {
  if (!left || !right) return false;
  const normalize = (node: RenderNode): unknown => ({
    component: node.component,
    props: node.props ?? {},
    style: node.style ?? {},
    text: node.text ?? '',
    children: (node.children ?? []).map(normalize),
  });
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

function flattenTree(tree?: RenderNode): RenderNode[] {
  if (!tree) return [];
  return [tree, ...(tree.children ?? []).flatMap(flattenTree)];
}

function readSource(files: CodeFile[]): string {
  return files.filter((file) => file.language !== 'json').map((file) => file.content).join('\n');
}

function runCustomValidator(
  testId: string,
  files: CodeFile[],
  tree: RenderNode | undefined,
  customValidators: CustomValidatorRegistry,
): { passed: boolean; error?: string } {
  const validator = customValidators[testId];
  if (!validator) return { passed: false, error: `Custom validator “${testId}” is not registered.` };
  try {
    const result = validator({ source: readSource(files), renderTree: tree, files });
    return typeof result === 'boolean' ? { passed: result } : result;
  } catch (error) {
    return { passed: false, error: error instanceof Error ? error.message : 'Custom validator failed.' };
  }
}

export function validateChallengeRequirements(
  files: CodeFile[],
  tree: RenderNode | undefined,
  requirements: ChallengeRequirement[],
  customValidators: CustomValidatorRegistry = {},
): RuleOutcome[] {
  const source = readSource(files);
  const nodes = flattenTree(tree);
  return requirements.map((requirement) => {
    let passed = false;
    let error: string | undefined;
    const validator = requirement.validator;
    if (validator.type === 'contains_text') passed = source.includes(validator.value) || nodes.some((node) => node.text?.includes(validator.value));
    if (validator.type === 'contains_component') passed = nodes.some((node) => node.component === validator.componentName);
    if (validator.type === 'contains_prop') {
      passed = nodes.some((node) => (!validator.componentName || node.component === validator.componentName)
        && validator.propName in (node.props ?? {})
        && (validator.expectedValue === undefined || String(node.props?.[validator.propName]) === validator.expectedValue));
    }
    if (validator.type === 'custom_test') ({ passed, error } = runCustomValidator(validator.testId, files, tree, customValidators));
    return {
      id: requirement.id,
      description: requirement.description,
      passed,
      pointsAwarded: passed ? requirement.points : 0,
      pointsAvailable: requirement.points,
      ...(error ? { error } : {}),
    };
  });
}

export function validateRenderRules(
  files: CodeFile[],
  tree: RenderNode | undefined,
  rules: RenderValidationRule[],
  customValidators: CustomValidatorRegistry = {},
): RuleOutcome[] {
  const nodes = flattenTree(tree);
  return rules.map((validation) => {
    const rule = validation.rule;
    let passed = false;
    let error: string | undefined;
    if (rule.type === 'component_exists') passed = nodes.filter((node) => node.component === rule.component).length >= (rule.minimumCount ?? 1);
    if (rule.type === 'text_exists') passed = nodes.some((node) => rule.exact ? node.text === rule.text : node.text?.includes(rule.text));
    if (rule.type === 'style_matches') passed = nodes.some((node) => (!rule.component || node.component === rule.component) && node.style?.[rule.property] === rule.expectedValue);
    if (rule.type === 'prop_matches') passed = nodes.some((node) => (!rule.component || node.component === rule.component) && node.props?.[rule.prop] === rule.expectedValue);
    if (rule.type === 'render_tree_matches') passed = renderTreesEqual(tree, rule.expectedTree);
    if (rule.type === 'custom_test') ({ passed, error } = runCustomValidator(rule.testId, files, tree, customValidators));
    return {
      id: validation.id,
      description: validation.description,
      passed,
      pointsAwarded: passed ? validation.points : 0,
      pointsAvailable: validation.points,
      ...(error ? { error } : {}),
    };
  });
}
