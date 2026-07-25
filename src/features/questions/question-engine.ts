import {
  parseCodeToRenderTree,
  renderTreesEqual,
  validateChallengeRequirements,
  validateRenderRules,
} from './code-preview';
import type {
  CodeRange,
  CustomValidatorRegistry,
  LocalQuestionResult,
  Question,
  QuestionAnswer,
  QuestionType,
  RuleOutcome,
} from './questions.types';

function sameSet(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function normalize(value: string, caseSensitive = false, trimWhitespace = true): string {
  const trimmed = trimWhitespace ? value.trim() : value;
  return caseSensitive ? trimmed : trimmed.toLocaleLowerCase();
}

function rangeMatches(left: CodeRange, right: CodeRange): boolean {
  return left.startLine === right.startLine
    && (right.startColumn === undefined || left.startColumn === right.startColumn)
    && (right.endLine === undefined || left.endLine === right.endLine)
    && (right.endColumn === undefined || left.endColumn === right.endColumn);
}

function outcome(id: string, description: string, passed: boolean, points = 1): RuleOutcome {
  return { id, description, passed, pointsAwarded: passed ? points : 0, pointsAvailable: points };
}

type AnswerPayload<T extends QuestionType> = Extract<QuestionAnswer, { type: T }>['answer'];

function getAnswer<T extends QuestionType>(answer: QuestionAnswer, type: T): AnswerPayload<T> {
  if (answer.type !== type) throw new Error(`Expected ${type} answer, received ${answer.type}.`);
  return (answer as Extract<QuestionAnswer, { type: T }>).answer as unknown as AnswerPayload<T>;
}

function resultFromOutcomes(answer: QuestionAnswer, outcomes: RuleOutcome[], maximumScore?: number, errors: string[] = []): LocalQuestionResult {
  const score = outcomes.reduce((total, item) => total + item.pointsAwarded, 0);
  const available = maximumScore ?? outcomes.reduce((total, item) => total + item.pointsAvailable, 0);
  const status = errors.length
    ? 'error'
    : score >= available && available > 0
      ? 'correct'
      : score > 0
        ? 'partially_correct'
        : 'incorrect';
  return { answer, status, score, maximumScore: available, ruleOutcomes: outcomes, validationErrors: errors };
}

export function answerMatchesQuestion(question: Question, answer?: QuestionAnswer): boolean {
  return answer === undefined || answer.type === question.type;
}

export function isAnswerComplete(question: Question, answer?: QuestionAnswer): boolean {
  if (!answer || answer.type !== question.type) return false;
  switch (question.type) {
    case 'multiple_choice': return getAnswer(answer, 'multiple_choice').selectedOptionId.length > 0;
    case 'multi_select': {
      const count = getAnswer(answer, 'multi_select').selectedOptionIds.length;
      return count >= (question.minimumSelections ?? 1) && count <= (question.maximumSelections ?? question.options.length);
    }
    case 'true_false': return typeof getAnswer(answer, 'true_false').value === 'boolean';
    case 'fill_in_the_blank': return question.blanks.every((blank) => Boolean(getAnswer(answer, 'fill_in_the_blank').values[blank.id]?.trim()));
    case 'match_pairs': return getAnswer(answer, 'match_pairs').pairs.length >= question.leftItems.length;
    case 'arrange_in_order': return getAnswer(answer, 'arrange_in_order').orderedItemIds.length === question.items.length;
    case 'complete_code': return question.blanks.every((blank) => Boolean(getAnswer(answer, 'complete_code').values[blank.id]?.trim()));
    case 'find_error': return getAnswer(answer, 'find_error').selectedRanges.length > 0;
    case 'predict_output': {
      const value = getAnswer(answer, 'predict_output');
      if (value.mode === 'multiple_choice') return Boolean(value.selectedOptionId);
      if (value.mode === 'text') return Boolean(value.value.trim());
      return Boolean(value.renderTree);
    }
    case 'identify_component': return Boolean(getAnswer(answer, 'identify_component').selectedComponentId);
    case 'drag_drop_builder': {
      const placements = getAnswer(answer, 'drag_drop_builder').placements;
      return question.slots.every((slot) => placements.filter((placement) => placement.slotId === slot.id).length >= (slot.minimumItems ?? 0));
    }
    case 'mini_challenge': return getAnswer(answer, 'mini_challenge').files.some((file) => file.editable !== false && file.content.trim().length > 0);
    case 'guess_three_things': return getAnswer(answer, 'guess_three_things').selectedOptionIds.length === question.requiredSelections;
    case 'build_and_render': return getAnswer(answer, 'build_and_render').files.some((file) => file.editable !== false && file.content.trim().length > 0);
  }
}

export function gradeQuestion(
  question: Question,
  answer: QuestionAnswer,
  customValidators: CustomValidatorRegistry = {},
): LocalQuestionResult {
  if (answer.type !== question.type) {
    return { answer, status: 'error', score: 0, maximumScore: 0, ruleOutcomes: [], validationErrors: [`Answer type “${answer.type}” does not match question type “${question.type}”.`] };
  }

  switch (question.type) {
    case 'multiple_choice':
      return resultFromOutcomes(answer, [outcome('answer', 'Choose the correct option', getAnswer(answer, 'multiple_choice').selectedOptionId === question.correctOptionId)]);
    case 'multi_select': {
      const selected = getAnswer(answer, 'multi_select').selectedOptionIds;
      const outcomes = question.correctOptionIds.map((id) => outcome(id, 'Select a correct option', selected.includes(id)));
      const incorrect = selected.filter((id) => !question.correctOptionIds.includes(id));
      incorrect.forEach((id) => outcomes.push(outcome(`incorrect-${id}`, 'Avoid incorrect options', false)));
      if (!question.allowPartialCredit && !sameSet(selected, question.correctOptionIds)) {
        return resultFromOutcomes(answer, outcomes.map((item) => ({ ...item, pointsAwarded: 0 })));
      }
      return resultFromOutcomes(answer, outcomes, question.correctOptionIds.length);
    }
    case 'true_false':
      return resultFromOutcomes(answer, [outcome('answer', 'Choose the correct truth value', getAnswer(answer, 'true_false').value === question.correctAnswer)]);
    case 'fill_in_the_blank': {
      const values = getAnswer(answer, 'fill_in_the_blank').values;
      const outcomes = question.blanks.map((blank) => {
        const value = normalize(values[blank.id] ?? '', blank.caseSensitive, blank.trimWhitespace ?? true);
        const passed = blank.acceptedAnswers.some((accepted) => normalize(accepted, blank.caseSensitive, blank.trimWhitespace ?? true) === value);
        return outcome(blank.id, `Complete “${blank.placeholder ?? blank.id}”`, passed);
      });
      return resultFromOutcomes(answer, outcomes);
    }
    case 'match_pairs': {
      const pairs = getAnswer(answer, 'match_pairs').pairs;
      const outcomes = question.correctPairs.map((pair) => outcome(`${pair.leftId}-${pair.rightId}`, 'Match a related pair', pairs.some((selected) => selected.leftId === pair.leftId && selected.rightId === pair.rightId)));
      return resultFromOutcomes(answer, outcomes);
    }
    case 'arrange_in_order': {
      const ordered = getAnswer(answer, 'arrange_in_order').orderedItemIds;
      const outcomes = question.correctOrder.map((id, index) => outcome(id, `Place item ${index + 1}`, ordered[index] === id));
      return resultFromOutcomes(answer, outcomes);
    }
    case 'complete_code': {
      const values = getAnswer(answer, 'complete_code').values;
      const outcomes = question.blanks.map((blank) => {
        const value = normalize(values[blank.id] ?? '', blank.caseSensitive);
        return outcome(blank.id, `Complete “${blank.placeholder ?? blank.id}”`, blank.acceptedAnswers.some((accepted) => normalize(accepted, blank.caseSensitive) === value));
      });
      return resultFromOutcomes(answer, outcomes);
    }
    case 'find_error': {
      const ranges = getAnswer(answer, 'find_error').selectedRanges;
      const outcomes = question.errors.map((error) => outcome(error.id, error.reason, ranges.some((range) => rangeMatches(range, error.range))));
      return resultFromOutcomes(answer, outcomes);
    }
    case 'predict_output': {
      const value = getAnswer(answer, 'predict_output');
      let passed = false;
      if (value.mode === 'multiple_choice') passed = value.selectedOptionId === question.correctOptionId;
      if (value.mode === 'text') passed = (question.acceptedTextAnswers ?? []).some((accepted) => normalize(accepted) === normalize(value.value));
      if (value.mode === 'ui_preview') passed = renderTreesEqual(value.renderTree, question.expectedRenderTree);
      return resultFromOutcomes(answer, [outcome('output', 'Predict the rendered output', passed)]);
    }
    case 'identify_component':
      return resultFromOutcomes(answer, [outcome('component', 'Choose the correct component', getAnswer(answer, 'identify_component').selectedComponentId === question.correctComponentId)]);
    case 'drag_drop_builder': {
      const placements = getAnswer(answer, 'drag_drop_builder').placements;
      const outcomes = question.correctPlacements.map((placement) => outcome(`${placement.slotId}-${placement.blockId}-${placement.position}`, 'Place a block in the correct slot', placements.some((selected) => selected.slotId === placement.slotId && selected.blockId === placement.blockId && selected.position === placement.position)));
      return resultFromOutcomes(answer, outcomes);
    }
    case 'mini_challenge': {
      const files = getAnswer(answer, 'mini_challenge').files;
      const sourceFile = files.find((file) => file.editable !== false && file.language !== 'json');
      const preview = sourceFile ? parseCodeToRenderTree(sourceFile.content, sourceFile.language) : { errors: ['No editable source file found.'] };
      const outcomes = validateChallengeRequirements(files, preview.tree, question.requirements, customValidators);
      return resultFromOutcomes(answer, outcomes, question.maximumScore, preview.errors);
    }
    case 'guess_three_things': {
      const selected = getAnswer(answer, 'guess_three_things').selectedOptionIds;
      const outcomes = question.correctOptionIds.map((id) => outcome(id, 'Select a correct item', selected.includes(id)));
      return resultFromOutcomes(answer, outcomes, question.requiredSelections);
    }
    case 'build_and_render': {
      const buildAnswer = getAnswer(answer, 'build_and_render');
      const sourceFile = buildAnswer.files.find((file) => file.editable !== false && file.language !== 'json');
      const preview = sourceFile ? parseCodeToRenderTree(sourceFile.content, sourceFile.language) : { errors: ['No editable source file found.'] };
      const hydratedAnswer: QuestionAnswer = { type: 'build_and_render', answer: { ...buildAnswer, renderTree: preview.tree } };
      const outcomes = validateRenderRules(buildAnswer.files, preview.tree, question.validationRules, customValidators);
      return resultFromOutcomes(hydratedAnswer, outcomes, question.maximumScore, preview.errors);
    }
  }
}

export function questionTypeIndex(type: QuestionType): number {
  const order: QuestionType[] = [
    'multiple_choice', 'multi_select', 'true_false', 'fill_in_the_blank', 'match_pairs',
    'arrange_in_order', 'complete_code', 'find_error', 'predict_output', 'identify_component',
    'drag_drop_builder', 'mini_challenge', 'guess_three_things', 'build_and_render',
  ];
  return order.indexOf(type);
}
