import {
  parseCodeToRenderTree,
  validateChallengeRequirements,
  validateRenderRules,
} from '../code-preview';

const validSource = `import { Text, View } from 'react-native';
export default function App() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ color: '#2563EB' }}>Hello, Expo!</Text>
    </View>
  );
}`;

describe('safe code preview', () => {
  test('parses a static App return tree', () => {
    const result = parseCodeToRenderTree(validSource, 'tsx');
    expect(result.errors).toEqual([]);
    expect(result.tree).toMatchObject({
      component: 'View',
      style: { flex: 1, padding: 20 },
      children: [{ component: 'Text', text: 'Hello, Expo!', style: { color: '#2563EB' } }],
    });
  });

  test.each([
    [`export default function App(){ return <Button title="Go" />; }`, 'not supported'],
    [`export default function App(){ return <Pressable onPress={() => alert('x')} />; }`, 'Event handlers'],
    [`export default function App(){ const value = 'Hi'; return <Text>{value}</Text>; }`, 'Dynamic expressions'],
  ])('rejects unsafe or unsupported source', (source, message) => {
    const result = parseCodeToRenderTree(source, 'tsx');
    expect(result.tree).toBeUndefined();
    expect(result.errors.join(' ')).toContain(message);
  });

  test('enforces the preview node limit', () => {
    const children = Array.from({ length: 101 }, (_, index) => `<Text>${index}</Text>`).join('');
    const result = parseCodeToRenderTree(`export default function App(){ return <View>${children}</View>; }`, 'tsx');
    expect(result.errors.join(' ')).toContain('100 components');
  });

  test('evaluates built-in and missing custom validators explicitly', () => {
    const file = { path: 'App.tsx', content: validSource, language: 'tsx' as const, editable: true };
    const tree = parseCodeToRenderTree(validSource, 'tsx').tree;
    const challenge = validateChallengeRequirements([file], tree, [
      { id: 'text', description: 'Greeting', points: 1, validator: { type: 'contains_text', value: 'Hello, Expo!' } },
      { id: 'custom', description: 'Custom', points: 1, validator: { type: 'custom_test', testId: 'missing' } },
    ]);
    expect(challenge[0]).toMatchObject({ passed: true, pointsAwarded: 1 });
    expect(challenge[1]).toMatchObject({ passed: false, error: expect.stringContaining('not registered') });

    const renderRules = validateRenderRules([file], tree, [
      { id: 'view', description: 'View exists', points: 1, rule: { type: 'component_exists', component: 'View' } },
      { id: 'color', description: 'Blue text', points: 1, rule: { type: 'style_matches', component: 'Text', property: 'color', expectedValue: '#2563EB' } },
    ]);
    expect(renderRules.every((outcome) => outcome.passed)).toBe(true);
  });

  test('supports every rule family and registered custom validators', () => {
    const file = { path: 'App.tsx', content: validSource, language: 'tsx' as const, editable: true };
    const tree = {
      component: 'View',
      props: { testID: 'root' },
      children: [{ component: 'Text', text: 'Hello, Expo!', style: { color: '#2563EB' } }],
    };
    const custom = { passes: () => true };
    const challenge = validateChallengeRequirements([file], tree, [
      { id: 'text', description: 'Text', points: 1, validator: { type: 'contains_text', value: 'Hello, Expo!' } },
      { id: 'component', description: 'Text component', points: 1, validator: { type: 'contains_component', componentName: 'Text' } },
      { id: 'prop', description: 'Root test ID', points: 1, validator: { type: 'contains_prop', componentName: 'View', propName: 'testID', expectedValue: 'root' } },
      { id: 'custom', description: 'Custom', points: 1, validator: { type: 'custom_test', testId: 'passes' } },
    ], custom);
    expect(challenge.every((item) => item.passed)).toBe(true);

    const renderRules = validateRenderRules([file], tree, [
      { id: 'component', description: 'View', points: 1, rule: { type: 'component_exists', component: 'View' } },
      { id: 'text', description: 'Greeting', points: 1, rule: { type: 'text_exists', text: 'Hello, Expo!', exact: true } },
      { id: 'style', description: 'Blue', points: 1, rule: { type: 'style_matches', component: 'Text', property: 'color', expectedValue: '#2563EB' } },
      { id: 'prop', description: 'Test ID', points: 1, rule: { type: 'prop_matches', component: 'View', prop: 'testID', expectedValue: 'root' } },
      { id: 'tree', description: 'Tree', points: 1, rule: { type: 'render_tree_matches', expectedTree: tree } },
      { id: 'custom', description: 'Custom', points: 1, rule: { type: 'custom_test', testId: 'passes' } },
    ], custom);
    expect(renderRules.every((item) => item.passed)).toBe(true);
  });
});
