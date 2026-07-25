import type { QuestionType } from './questions.types';

export const QUESTION_TYPES: QuestionType[] = [
  'multiple_choice', 'multi_select', 'true_false', 'fill_in_the_blank', 'match_pairs',
  'arrange_in_order', 'complete_code', 'find_error', 'predict_output', 'identify_component',
  'drag_drop_builder', 'mini_challenge', 'guess_three_things', 'build_and_render',
];

export const QUESTION_TYPE_META: Record<QuestionType, { label: string; color: string; softColor: string }> = {
  multiple_choice: { label: 'Multiple Choice', color: '#46B85A', softColor: '#ECF9EF' },
  multi_select: { label: 'Multi Select', color: '#FFB20F', softColor: '#FFF8E6' },
  true_false: { label: 'True or False', color: '#3387E8', softColor: '#EDF5FF' },
  fill_in_the_blank: { label: 'Fill in the Blank', color: '#8757D8', softColor: '#F5F0FF' },
  match_pairs: { label: 'Match the Pairs', color: '#F04E84', softColor: '#FFF0F5' },
  arrange_in_order: { label: 'Arrange in Order', color: '#20A997', softColor: '#ECFAF7' },
  complete_code: { label: 'Complete the Code', color: '#F28B19', softColor: '#FFF5E9' },
  find_error: { label: 'Find the Error', color: '#EA535B', softColor: '#FFF0F1' },
  predict_output: { label: 'Predict the Output', color: '#3387E8', softColor: '#EDF5FF' },
  identify_component: { label: 'Identify the Correct Component', color: '#3387E8', softColor: '#EDF5FF' },
  drag_drop_builder: { label: 'Drag and Drop Builder', color: '#8757D8', softColor: '#F5F0FF' },
  mini_challenge: { label: 'Mini Challenge', color: '#F28B19', softColor: '#FFF5E9' },
  guess_three_things: { label: 'Guess Three Things', color: '#46B85A', softColor: '#ECF9EF' },
  build_and_render: { label: 'Build & Render', color: '#3387E8', softColor: '#EDF5FF' },
};

export const QUESTION_COLORS = {
  ink: '#17213B', muted: '#6C7383', border: '#E2E6EC', background: '#F7F9FC',
  surface: '#FFFFFF', blue: '#2289FD', blueDark: '#1A6ECE', green: '#34A853',
  greenSoft: '#EAF8EE', red: '#DE4C5B', redSoft: '#FFF0F2', amber: '#F59E0B',
  code: '#F7F7FA',
};
