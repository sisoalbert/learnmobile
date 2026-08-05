import {
  COURSE_SEEDS,
  numericSuffix,
  optionGroups,
  publicQuestion,
  QUESTION_SEEDS,
} from '../../../convex/contentSeed';

const PRIVATE_SOLUTION_KEYS = [
  'correctOptionId',
  'correctOptionIds',
  'correctAnswer',
  'correctPairs',
  'correctOrder',
  'correctPlacements',
  'acceptedTextAnswers',
  'expectedRenderTree',
  'errors',
  'grounding',
  'review',
] as const;

describe('learning content seed', () => {
  test('preserves the complete existing curriculum with stable keys', () => {
    expect(COURSE_SEEDS).toHaveLength(5);
    expect(QUESTION_SEEDS).toHaveLength(30);
    expect(new Set(QUESTION_SEEDS.map((question) => question.lessonId))).toHaveProperty(
      'size',
      15,
    );
    expect(new Set(QUESTION_SEEDS.map((question) => question.type))).toEqual(
      new Set([
        'arrange_in_order',
        'build_and_render',
        'complete_code',
        'drag_drop_builder',
        'fill_in_the_blank',
        'find_error',
        'guess_three_things',
        'identify_component',
        'match_pairs',
        'mini_challenge',
        'multi_select',
        'multiple_choice',
        'predict_output',
        'true_false',
      ]),
    );
    expect(new Set(QUESTION_SEEDS.map((question) => question.id)).size).toBe(30);
  });

  test('redacts solutions without changing the source fixture', () => {
    for (const question of QUESTION_SEEDS) {
      const original = JSON.parse(JSON.stringify(question)) as Record<string, unknown>;
      const published = publicQuestion(question);

      for (const privateKey of PRIVATE_SOLUTION_KEYS) {
        expect(published).not.toHaveProperty(privateKey);
      }

      if (Array.isArray(published.blanks)) {
        for (const blank of published.blanks) {
          expect(blank).not.toHaveProperty('acceptedAnswers');
        }
      }

      expect(question).toEqual(original);
    }
  });

  test('extracts deterministic option records and numeric ordering', () => {
    const question = QUESTION_SEEDS.find((item) => optionGroups(item).length > 0);

    expect(question).toBeDefined();
    expect(optionGroups(question!)).toEqual(optionGroups(question!));
    expect(numericSuffix('beginner-course-12')).toBe(12);
    expect(numericSuffix('no-suffix')).toBe(0);
  });
});
