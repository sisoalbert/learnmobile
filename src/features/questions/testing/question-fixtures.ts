import type { BaseQuestion, Question, QuestionType, RenderNode } from '../questions.types';

const base = (id: string, type: QuestionType, title: string, prompt: string): BaseQuestion => ({
  id,
  type,
  title,
  prompt,
  difficulty: 'beginner',
  topic: 'Expo foundations',
  tags: ['expo', 'react-native'],
  xp: 10,
  estimatedSeconds: 45,
  hints: [{ id: `${id}-hint`, text: 'Think about the role each React Native primitive plays.' }],
  explanation: { summary: 'Nice work — this is a core React Native and Expo concept.' },
  status: 'published',
  version: 1,
});

const helloTree: RenderNode = {
  component: 'View',
  style: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  children: [{ component: 'Text', text: 'Hello, Expo!', style: { color: '#2563EB', fontSize: 28, fontWeight: '600' } }],
};

const helloSource = `import { Text, View } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#2563EB', fontSize: 28, fontWeight: '600' }}>
        Hello, Expo!
      </Text>
    </View>
  );
}`;

export const QUESTION_FIXTURES: Question[] = [
  {
    ...base('q-multiple-choice', 'multiple_choice', 'Multiple Choice', 'What does the View component do?'),
    type: 'multiple_choice',
    options: [
      { id: 'display', text: 'Display text' },
      { id: 'container', text: 'Act as a container for layouts' },
      { id: 'audio', text: 'Play audio' },
      { id: 'navigation', text: 'Handle navigation' },
    ],
    correctOptionId: 'container',
  },
  {
    ...base('q-multi-select', 'multi_select', 'Multi Select', 'Which are built-in React Native components?'),
    type: 'multi_select',
    instruction: 'Choose all correct answers.',
    options: [
      { id: 'view', text: 'View' }, { id: 'text', text: 'Text' }, { id: 'image', text: 'Image' },
      { id: 'router', text: 'Router' }, { id: 'database', text: 'Database' },
    ],
    correctOptionIds: ['view', 'text', 'image'],
    minimumSelections: 1,
    maximumSelections: 3,
    allowPartialCredit: true,
  },
  {
    ...base('q-true-false', 'true_false', 'True or False', 'Decide whether the statement is correct.'),
    type: 'true_false',
    statement: 'Expo Go allows you to run your app on a physical device.',
    correctAnswer: true,
  },
  {
    ...base('q-fill-blank', 'fill_in_the_blank', 'Fill in the Blank', 'Import the Text component from react-native.'),
    type: 'fill_in_the_blank',
    template: `import { {{component}} } from 'react-native';`,
    blanks: [{ id: 'component', acceptedAnswers: ['Text'], placeholder: 'component', caseSensitive: true }],
    language: 'typescript',
  },
  {
    ...base('q-match-pairs', 'match_pairs', 'Match the Pairs', 'Match each component to what it does.'),
    type: 'match_pairs',
    leftItems: [
      { id: 'view', content: 'View' }, { id: 'text', content: 'Text' },
      { id: 'image', content: 'Image' }, { id: 'scroll', content: 'ScrollView' },
    ],
    rightItems: [
      { id: 'container', content: 'Container' }, { id: 'displays-text', content: 'Displays text' },
      { id: 'displays-image', content: 'Displays image' }, { id: 'scrolls', content: 'Scrolls content' },
    ],
    correctPairs: [
      { leftId: 'view', rightId: 'container' }, { leftId: 'text', rightId: 'displays-text' },
      { leftId: 'image', rightId: 'displays-image' }, { leftId: 'scroll', rightId: 'scrolls' },
    ],
  },
  {
    ...base('q-arrange-order', 'arrange_in_order', 'Arrange in Order', 'Arrange the steps to create and run an Expo app.'),
    type: 'arrange_in_order',
    instruction: 'Long-press and drag, or use the arrow buttons.',
    items: [
      { id: 'scan', content: 'Scan the QR code' }, { id: 'create', content: 'Create the project' },
      { id: 'run', content: 'Run it on your device' }, { id: 'server', content: 'Start the development server' },
    ],
    correctOrder: ['create', 'server', 'scan', 'run'],
    direction: 'vertical',
  },
  {
    ...base('q-complete-code', 'complete_code', 'Complete the Code', 'Finish the component so it displays a greeting.'),
    type: 'complete_code',
    language: 'tsx',
    codeTemplate: `export default function App() {
  return (
    <View>
      <Text>{{message}}</Text>
    </View>
  );
}`,
    blanks: [{ id: 'message', acceptedAnswers: ['Hello Expo!', 'Hello, Expo!'], placeholder: 'message' }],
    runnable: true,
  },
  {
    ...base('q-find-error', 'find_error', 'Find the Error', 'Tap the line containing the error.'),
    type: 'find_error',
    language: 'tsx',
    code: `import { View, Text } from 'react-native';

export default function App() {
  retrun (
    <View><Text>Hello</Text></View>
  );
}`,
    errors: [{ id: 'typo', range: { startLine: 4 }, errorCode: 'retrun', reason: '“return” is misspelled.' }],
    selectionMode: 'line',
  },
  {
    ...base('q-predict-output', 'predict_output', 'Predict the Output', 'What will this code display?'),
    type: 'predict_output',
    language: 'tsx',
    code: `<View><Text>Hello Expo!</Text></View>`,
    answerMode: 'ui_preview',
    options: [
      { id: 'hello', text: 'Hello Expo!', uiTree: { component: 'View', children: [{ component: 'Text', text: 'Hello Expo!' }] } },
      { id: 'blank', text: 'A blank screen', uiTree: { component: 'View' } },
    ],
    correctOptionId: 'hello',
    expectedRenderTree: { component: 'View', children: [{ component: 'Text', text: 'Hello Expo!' }] },
  },
  {
    ...base('q-identify-component', 'identify_component', 'Identify the Correct Component', 'Which component should you use to create a button?'),
    type: 'identify_component',
    taskDescription: 'Tap the React Native component commonly used to handle a button press.',
    options: [
      { id: 'pressable', componentName: 'Pressable', code: '<Pressable />' },
      { id: 'image', componentName: 'Image', code: '<Image />' },
      { id: 'input', componentName: 'TextInput', code: '<TextInput />' },
      { id: 'view', componentName: 'View', code: '<View />' },
    ],
    correctComponentId: 'pressable',
  },
  {
    ...base('q-drag-builder', 'drag_drop_builder', 'Drag and Drop Builder', 'Build a layout that displays an image and greeting.'),
    type: 'drag_drop_builder',
    instruction: 'Drag blocks into the slot, or select a block and tap the slot.',
    availableBlocks: [
      { id: 'open', blockType: 'opening_tag', value: '<View>', acceptsChildren: true },
      { id: 'image', blockType: 'component', value: '<Image />' },
      { id: 'text', blockType: 'text', value: '<Text>Hello!</Text>' },
      { id: 'close', blockType: 'closing_tag', value: '</View>' },
    ],
    slots: [{ id: 'layout', acceptedBlockTypes: ['opening_tag', 'component', 'text', 'closing_tag'], minimumItems: 4, maximumItems: 4 }],
    correctPlacements: [
      { slotId: 'layout', blockId: 'open', position: 0 }, { slotId: 'layout', blockId: 'image', position: 1 },
      { slotId: 'layout', blockId: 'text', position: 2 }, { slotId: 'layout', blockId: 'close', position: 3 },
    ],
  },
  {
    ...base('q-mini-challenge', 'mini_challenge', 'Mini Challenge', 'Create a screen that shows your name and a button.'),
    type: 'mini_challenge',
    scenario: 'Build a simple profile card with your name and a Pressable.',
    starterFiles: [{
      path: 'App.tsx', language: 'tsx', editable: true,
      content: `import { Pressable, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text>My Profile</Text>
    </View>
  );
}`,
    }],
    requirements: [
      { id: 'name', description: 'Show your name', points: 1, validator: { type: 'contains_text', value: 'John Doe' } },
      { id: 'button', description: 'Add a Pressable', points: 1, validator: { type: 'contains_component', componentName: 'Pressable' } },
    ],
    previewEnabled: true,
    maximumScore: 2,
  },
  {
    ...base('q-guess-three', 'guess_three_things', 'Guess Three Things', 'Select the three valid React Native style properties.'),
    type: 'guess_three_things',
    options: [
      { id: 'flex', text: 'flex' }, { id: 'margin', text: 'margin' }, { id: 'padding', text: 'padding' },
      { id: 'onclick', text: 'onclick' }, { id: 'fontsize', text: 'fontsize' },
      { id: 'alignItems', text: 'alignItems' }, { id: 'background', text: 'background' },
    ],
    correctOptionIds: ['flex', 'padding', 'alignItems'],
    requiredSelections: 3,
  },
  {
    ...base('q-build-render', 'build_and_render', 'Build & Render', 'Write the code to match the target preview.'),
    type: 'build_and_render',
    language: 'tsx',
    starterFiles: [{ path: 'App.tsx', language: 'tsx', editable: true, content: helloSource.replace("color: '#2563EB'", "color: '#111827'").replace('Hello, Expo!', 'Change me') }],
    targetPreview: helloTree,
    validationRules: [
      { id: 'text', description: 'Display “Hello, Expo!”', points: 1, rule: { type: 'text_exists', text: 'Hello, Expo!', exact: true } },
      { id: 'blue', description: 'Make the text blue', points: 1, rule: { type: 'style_matches', component: 'Text', property: 'color', expectedValue: '#2563EB' } },
      { id: 'size', description: 'Use a 28px font size', points: 1, rule: { type: 'style_matches', component: 'Text', property: 'fontSize', expectedValue: 28 } },
    ],
    maximumScore: 3,
    previewDevice: { width: 390, height: 844, platform: 'ios' },
  },
];

export const QUESTION_FIXTURES_BY_TYPE = Object.fromEntries(
  QUESTION_FIXTURES.map((question) => [question.type, question]),
) as Record<QuestionType, Question>;

export function isQuestionType(value: string): value is QuestionType {
  return value in QUESTION_FIXTURES_BY_TYPE;
}
