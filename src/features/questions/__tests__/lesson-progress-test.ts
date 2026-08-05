import {
  getLessonQuestionProgressPercent,
  MAX_QUESTION_PROGRESS_PERCENT,
} from '../lesson-progress';

describe('lesson question progress', () => {
  test('shows position progress without completing the lesson bar', () => {
    expect(getLessonQuestionProgressPercent(1, 2)).toBe(50);
    expect(getLessonQuestionProgressPercent(2, 2)).toBe(MAX_QUESTION_PROGRESS_PERCENT);
  });

  test('caps single-question and out-of-range positions at 90 percent', () => {
    expect(getLessonQuestionProgressPercent(1, 1)).toBe(90);
    expect(getLessonQuestionProgressPercent(8, 2)).toBe(90);
  });

  test('handles empty and invalid lesson totals safely', () => {
    expect(getLessonQuestionProgressPercent(1, 0)).toBe(0);
    expect(getLessonQuestionProgressPercent(1, -2)).toBe(0);
    expect(getLessonQuestionProgressPercent(Number.NaN, 2)).toBe(0);
  });
});
