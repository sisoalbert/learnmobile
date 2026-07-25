import { QUESTION_FIXTURES, QUESTION_FIXTURES_BY_TYPE } from '../question-fixtures';
import { gradeQuestion, isAnswerComplete } from '../question-engine';
import type { QuestionAnswer, QuestionType } from '../questions.types';

const correctMiniSource = `import { Pressable, Text, View } from 'react-native';
export default function App() {
  return <View><Text>John Doe</Text><Pressable><Text>Say Hello</Text></Pressable></View>;
}`;

const correctBuildSource = `import { Text, View } from 'react-native';
export default function App() {
  return (
    <View style={{ flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#2563EB', fontSize: 28, fontWeight: '600' }}>Hello, Expo!</Text>
    </View>
  );
}`;

const answers: Record<QuestionType, QuestionAnswer> = {
  multiple_choice: { type: 'multiple_choice', answer: { selectedOptionId: 'container' } },
  multi_select: { type: 'multi_select', answer: { selectedOptionIds: ['view', 'text', 'image'] } },
  true_false: { type: 'true_false', answer: { value: true } },
  fill_in_the_blank: { type: 'fill_in_the_blank', answer: { values: { component: 'Text' } } },
  match_pairs: { type: 'match_pairs', answer: { pairs: [
    { leftId: 'view', rightId: 'container' }, { leftId: 'text', rightId: 'displays-text' },
    { leftId: 'image', rightId: 'displays-image' }, { leftId: 'scroll', rightId: 'scrolls' },
  ] } },
  arrange_in_order: { type: 'arrange_in_order', answer: { orderedItemIds: ['create', 'server', 'scan', 'run'] } },
  complete_code: { type: 'complete_code', answer: { values: { message: 'Hello Expo!' } } },
  find_error: { type: 'find_error', answer: { selectedRanges: [{ startLine: 4 }] } },
  predict_output: { type: 'predict_output', answer: { mode: 'ui_preview', renderTree: { component: 'View', children: [{ component: 'Text', text: 'Hello Expo!' }] } } },
  identify_component: { type: 'identify_component', answer: { selectedComponentId: 'pressable' } },
  drag_drop_builder: { type: 'drag_drop_builder', answer: { placements: [
    { slotId: 'layout', blockId: 'open', position: 0 }, { slotId: 'layout', blockId: 'image', position: 1 },
    { slotId: 'layout', blockId: 'text', position: 2 }, { slotId: 'layout', blockId: 'close', position: 3 },
  ] } },
  mini_challenge: { type: 'mini_challenge', answer: { files: [{ path: 'App.tsx', content: correctMiniSource, language: 'tsx', editable: true }] } },
  guess_three_things: { type: 'guess_three_things', answer: { selectedOptionIds: ['flex', 'padding', 'alignItems'] } },
  build_and_render: { type: 'build_and_render', answer: { files: [{ path: 'App.tsx', content: correctBuildSource, language: 'tsx', editable: true }] } },
};

describe('question grading', () => {
  test.each(QUESTION_FIXTURES.map((question) => question.type))('grades a correct %s answer', (type) => {
    const question = QUESTION_FIXTURES_BY_TYPE[type];
    const answer = answers[type];
    expect(isAnswerComplete(question, answer)).toBe(true);
    expect(gradeQuestion(question, answer)).toMatchObject({ status: 'correct' });
  });

  test('returns partial credit for a partially correct multi-select answer', () => {
    const result = gradeQuestion(QUESTION_FIXTURES_BY_TYPE.multi_select, {
      type: 'multi_select',
      answer: { selectedOptionIds: ['view'] },
    });
    expect(result.status).toBe('partially_correct');
    expect(result.score).toBe(1);
    expect(result.maximumScore).toBe(3);
  });

  test('normalizes whitespace and case when the schema allows it', () => {
    const question = {
      ...QUESTION_FIXTURES_BY_TYPE.fill_in_the_blank,
      blanks: [{ id: 'component', acceptedAnswers: ['Text'], trimWhitespace: true, caseSensitive: false }],
    };
    const result = gradeQuestion(question, { type: 'fill_in_the_blank', answer: { values: { component: '  text ' } } });
    expect(result.status).toBe('correct');
  });

  test('rejects mismatched answer discriminants', () => {
    const result = gradeQuestion(QUESTION_FIXTURES_BY_TYPE.true_false, answers.multiple_choice);
    expect(result.status).toBe('error');
    expect(result.validationErrors[0]).toContain('does not match');
  });
});
