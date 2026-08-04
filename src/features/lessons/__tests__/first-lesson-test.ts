import { firstLessonQuestions } from '@/content/questions';

describe('first lesson', () => {
  test('contains exactly eight unique bundled questions without the removed ordering question', () => {
    const ids = firstLessonQuestions.map((question) => question.id);

    expect(firstLessonQuestions).toHaveLength(8);
    expect(new Set(ids).size).toBe(8);
    expect(ids).not.toContain('beginner-c1-l2-ao-001');
    expect(firstLessonQuestions.reduce((total, question) => total + question.xp, 0)).toBe(85);
    expect(firstLessonQuestions.every((question) => question.status === 'published')).toBe(true);
  });

  test('starts with Expo foundations and ends with a React Native import', () => {
    expect(firstLessonQuestions[0].id).toBe('beginner-c1-l1-mc-001');
    expect(firstLessonQuestions[7].id).toBe('beginner-c2-l2-fb-001');
  });
});
