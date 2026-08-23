export type QuestionType =
  | 'multiple_choice'
  | 'multi_select'
  | 'true_false'
  | 'fill_in_the_blank'
  | 'match_pairs'
  | 'arrange_in_order'
  | 'complete_code'
  | 'find_error'
  | 'predict_output'
  | 'identify_component'
  | 'drag_drop_builder'
  | 'mini_challenge'
  | 'guess_three_things'
  | 'build_and_render';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type QuestionStatus = 'draft' | 'published' | 'archived';

export interface QuestionExplanation {
  summary: string;
  details?: string;
  documentationUrl?: string;
}

export interface QuestionHint {
  id: string;
  text: string;
  penalty?: number;
}

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  title: string;
  prompt: string;
  instruction?: string;
  difficulty: Difficulty;
  topic: string;
  tags?: string[];
  xp: number;
  estimatedSeconds?: number;
  hints?: QuestionHint[];
  explanation?: QuestionExplanation;
  status: QuestionStatus;
  version: number;
}

export interface ChoiceOption {
  id: string;
  text: string;
  imageUrl?: string;
  code?: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  options: ChoiceOption[];
  correctOptionId: string;
  shuffleOptions?: boolean;
  codeSnippet?: string;
  language?: 'javascript' | 'typescript' | 'jsx' | 'tsx';
}

export interface MultipleChoiceAnswer { selectedOptionId: string }

export interface MultiSelectQuestion extends BaseQuestion {
  type: 'multi_select';
  options: ChoiceOption[];
  correctOptionIds: string[];
  minimumSelections?: number;
  maximumSelections?: number;
  shuffleOptions?: boolean;
  allowPartialCredit?: boolean;
}

export interface MultiSelectAnswer { selectedOptionIds: string[] }

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true_false';
  statement: string;
  correctAnswer: boolean;
}

export interface TrueFalseAnswer { value: boolean }

export interface FillBlankField {
  id: string;
  acceptedAnswers: string[];
  placeholder?: string;
  caseSensitive?: boolean;
  trimWhitespace?: boolean;
}

export interface FillInTheBlankQuestion extends BaseQuestion {
  type: 'fill_in_the_blank';
  template: string;
  blanks: FillBlankField[];
  language?: 'typescript' | 'javascript' | 'tsx' | 'text';
}

export interface FillInTheBlankAnswer { values: Record<string, string> }

export interface MatchItem {
  id: string;
  content: string;
  code?: string;
  imageUrl?: string;
}

export interface MatchPair { leftId: string; rightId: string }

export interface MatchPairsQuestion extends BaseQuestion {
  type: 'match_pairs';
  leftItems: MatchItem[];
  rightItems: MatchItem[];
  correctPairs: MatchPair[];
  shuffleLeft?: boolean;
  shuffleRight?: boolean;
}

export interface MatchPairsAnswer { pairs: MatchPair[] }

export interface OrderItem {
  id: string;
  content: string;
  code?: string;
  imageUrl?: string;
}

export interface ArrangeInOrderQuestion extends BaseQuestion {
  type: 'arrange_in_order';
  items: OrderItem[];
  correctOrder: string[];
  direction?: 'vertical' | 'horizontal';
}

export interface ArrangeInOrderAnswer { orderedItemIds: string[] }

export interface CodeBlank {
  id: string;
  acceptedAnswers: string[];
  placeholder?: string;
  caseSensitive?: boolean;
}

export interface CodeFile {
  path: string;
  content: string;
  language: 'javascript' | 'typescript' | 'jsx' | 'tsx' | 'json';
  editable?: boolean;
}

export interface CompleteCodeQuestion extends BaseQuestion {
  type: 'complete_code';
  language: 'javascript' | 'typescript' | 'jsx' | 'tsx';
  codeTemplate: string;
  blanks: CodeBlank[];
  runnable?: boolean;
  starterFiles?: CodeFile[];
}

export interface CompleteCodeAnswer {
  values: Record<string, string>;
  completedCode?: string;
}

export interface CodeRange {
  startLine: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
}

export interface CodeErrorTarget {
  id: string;
  range: CodeRange;
  errorCode?: string;
  reason: string;
}

export interface FindErrorQuestion extends BaseQuestion {
  type: 'find_error';
  language: 'javascript' | 'typescript' | 'jsx' | 'tsx';
  code: string;
  errors: CodeErrorTarget[];
  selectionMode: 'line' | 'range' | 'token';
}

export interface FindErrorAnswer {
  selectedRanges: CodeRange[];
  correction?: string;
}

export interface RenderStyle {
  [property: string]: string | number | boolean | undefined;
}

export interface RenderNode {
  id?: string;
  component: 'View' | 'Text' | 'Image' | 'Pressable' | 'TextInput' | 'ScrollView' | 'SafeAreaView' | string;
  props?: Record<string, unknown>;
  style?: RenderStyle;
  text?: string;
  children?: RenderNode[];
}

export interface OutputOption {
  id: string;
  text?: string;
  imageUrl?: string;
  uiTree?: RenderNode;
}

export interface PredictOutputQuestion extends BaseQuestion {
  type: 'predict_output';
  language: 'javascript' | 'typescript' | 'jsx' | 'tsx';
  code: string;
  answerMode: 'multiple_choice' | 'text' | 'ui_preview';
  options?: OutputOption[];
  correctOptionId?: string;
  acceptedTextAnswers?: string[];
  expectedRenderTree?: RenderNode;
}

export type PredictOutputAnswer =
  | { mode: 'multiple_choice'; selectedOptionId: string }
  | { mode: 'text'; value: string }
  | { mode: 'ui_preview'; renderTree: RenderNode };

export interface ComponentOption {
  id: string;
  componentName: string;
  label?: string;
  icon?: string;
  previewImageUrl?: string;
  code?: string;
}

export interface IdentifyComponentQuestion extends BaseQuestion {
  type: 'identify_component';
  taskDescription: string;
  options: ComponentOption[];
  correctComponentId: string;
  shuffleOptions?: boolean;
}

export interface IdentifyComponentAnswer { selectedComponentId: string }

export interface BuilderBlock {
  id: string;
  blockType: 'component' | 'opening_tag' | 'closing_tag' | 'text' | 'prop' | 'expression';
  value: string;
  displayLabel?: string;
  acceptsChildren?: boolean;
}

export interface BuilderSlot {
  id: string;
  parentSlotId?: string;
  acceptedBlockIds?: string[];
  acceptedBlockTypes?: BuilderBlock['blockType'][];
  minimumItems?: number;
  maximumItems?: number;
}

export interface BuilderPlacement { slotId: string; blockId: string; position: number }

export interface DragDropBuilderQuestion extends BaseQuestion {
  type: 'drag_drop_builder';
  availableBlocks: BuilderBlock[];
  slots: BuilderSlot[];
  correctPlacements: BuilderPlacement[];
  allowUnusedBlocks?: boolean;
}

export interface DragDropBuilderAnswer { placements: BuilderPlacement[] }

export interface ChallengeRequirement {
  id: string;
  description: string;
  points: number;
  validator:
    | { type: 'contains_text'; value: string }
    | { type: 'contains_component'; componentName: string }
    | { type: 'contains_prop'; componentName?: string; propName: string; expectedValue?: string }
    | { type: 'custom_test'; testId: string };
}

export interface MiniChallengeQuestion extends BaseQuestion {
  type: 'mini_challenge';
  scenario: string;
  starterFiles: CodeFile[];
  requirements: ChallengeRequirement[];
  previewEnabled?: boolean;
  maximumScore: number;
}

export interface MiniChallengeAnswer { files: CodeFile[] }

export interface GuessItem {
  id: string;
  text: string;
  code?: string;
  imageUrl?: string;
}

export interface GuessThreeThingsQuestion extends BaseQuestion {
  type: 'guess_three_things';
  options: GuessItem[];
  correctOptionIds: [string, string, string];
  requiredSelections: 3;
  shuffleOptions?: boolean;
}

export interface GuessThreeThingsAnswer { selectedOptionIds: [string, string, string] }

export interface RenderValidationRule {
  id: string;
  description: string;
  points: number;
  rule:
    | { type: 'component_exists'; component: string; minimumCount?: number }
    | { type: 'text_exists'; text: string; exact?: boolean }
    | { type: 'style_matches'; component?: string; property: string; expectedValue: string | number | boolean }
    | { type: 'prop_matches'; component?: string; prop: string; expectedValue: unknown }
    | { type: 'render_tree_matches'; expectedTree: RenderNode }
    | { type: 'custom_test'; testId: string };
}

export interface BuildAndRenderQuestion extends BaseQuestion {
  type: 'build_and_render';
  language: 'javascript' | 'typescript' | 'jsx' | 'tsx';
  starterFiles: CodeFile[];
  targetPreview: RenderNode;
  validationRules: RenderValidationRule[];
  maximumScore: number;
  previewDevice?: { width: number; height: number; platform: 'ios' | 'android' };
}

export interface BuildAndRenderAnswer { files: CodeFile[]; renderTree?: RenderNode }

export type Question =
  | MultipleChoiceQuestion | MultiSelectQuestion | TrueFalseQuestion | FillInTheBlankQuestion
  | MatchPairsQuestion | ArrangeInOrderQuestion | CompleteCodeQuestion | FindErrorQuestion
  | PredictOutputQuestion | IdentifyComponentQuestion | DragDropBuilderQuestion
  | MiniChallengeQuestion | GuessThreeThingsQuestion | BuildAndRenderQuestion;

export type QuestionAnswer =
  | { type: 'multiple_choice'; answer: MultipleChoiceAnswer }
  | { type: 'multi_select'; answer: MultiSelectAnswer }
  | { type: 'true_false'; answer: TrueFalseAnswer }
  | { type: 'fill_in_the_blank'; answer: FillInTheBlankAnswer }
  | { type: 'match_pairs'; answer: MatchPairsAnswer }
  | { type: 'arrange_in_order'; answer: ArrangeInOrderAnswer }
  | { type: 'complete_code'; answer: CompleteCodeAnswer }
  | { type: 'find_error'; answer: FindErrorAnswer }
  | { type: 'predict_output'; answer: PredictOutputAnswer }
  | { type: 'identify_component'; answer: IdentifyComponentAnswer }
  | { type: 'drag_drop_builder'; answer: DragDropBuilderAnswer }
  | { type: 'mini_challenge'; answer: MiniChallengeAnswer }
  | { type: 'guess_three_things'; answer: GuessThreeThingsAnswer }
  | { type: 'build_and_render'; answer: BuildAndRenderAnswer };

export interface QuestionAttempt {
  id: string;
  userId: string;
  questionId: string;
  lessonId: string;
  questionType: QuestionType;
  answer: QuestionAnswer;
  status: 'in_progress' | 'submitted' | 'correct' | 'incorrect' | 'partially_correct';
  score: number;
  maximumScore: number;
  hintsUsed: string[];
  attemptsCount: number;
  durationMs: number;
  submittedAt?: number;
  createdAt: number;
}

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  skillLevel: Difficulty;
  topic: string;
  questionIds: string[];
  requiredXp?: number;
  order: number;
  status: QuestionStatus;
}

export interface CourseUnit {
  id: string;
  title: string;
  description?: string;
  lessonIds: string[];
  order: number;
  status: QuestionStatus;
}

export type LocalQuestionStatus = 'correct' | 'incorrect' | 'partially_correct' | 'error';

export interface RuleOutcome {
  id: string;
  description: string;
  passed: boolean;
  pointsAwarded: number;
  pointsAvailable: number;
  error?: string;
}

export interface LocalQuestionResult {
  answer: QuestionAnswer;
  status: LocalQuestionStatus;
  score: number;
  maximumScore: number;
  ruleOutcomes: RuleOutcome[];
  validationErrors: string[];
}

export type CustomValidator = (context: {
  source: string;
  renderTree?: RenderNode;
  files: CodeFile[];
}) => boolean | { passed: boolean; error?: string };

export type CustomValidatorRegistry = Record<string, CustomValidator>;
