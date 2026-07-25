import { firstLessonQuestions } from '@/content/questions';

describe('first lesson', () => {
  test('contains exactly nine unique bundled questions', () => {
    const ids = firstLessonQuestions.map((question) => question.id);

    expect(firstLessonQuestions).toHaveLength(9);
    expect(new Set(ids).size).toBe(9);
    expect(firstLessonQuestions.every((question) => question.status === 'published')).toBe(true);
  });

  test('starts with Expo foundations and ends with a React Native import', () => {
    expect(firstLessonQuestions[0].id).toBe('beginner-c1-l1-mc-001');
    expect(firstLessonQuestions[8].id).toBe('beginner-c2-l2-fb-001');
  });
});
