import { createInitialArrangeOrder } from '../arrange-order';
import { QUESTION_FIXTURES_BY_TYPE } from '../testing/question-fixtures';
import type { ArrangeInOrderQuestion } from '../questions.types';

describe('Arrange in Order initialization', () => {
  test('creates a deterministic complete order from public question data', () => {
    const question = QUESTION_FIXTURES_BY_TYPE.arrange_in_order as ArrangeInOrderQuestion;
    const first = createInitialArrangeOrder(question);
    const second = createInitialArrangeOrder(question);

    expect(first).toEqual(second);
    expect(first).toHaveLength(question.items.length);
    expect(new Set(first)).toEqual(new Set(question.items.map((item) => item.id)));
  });

  test('does not require the private correct order', () => {
    const question: ArrangeInOrderQuestion = {
      ...(QUESTION_FIXTURES_BY_TYPE.arrange_in_order as ArrangeInOrderQuestion),
      id: 'q-rotate-correct-order',
      items: [
        { id: 'b', content: 'B' },
        { id: 'a', content: 'A' },
      ],
      correctOrder: undefined as unknown as string[],
    };

    const initial = createInitialArrangeOrder(question);
    expect(initial).toEqual(['a', 'b']);
  });

  test('uses a different deterministic order on retry when possible', () => {
    const question = QUESTION_FIXTURES_BY_TYPE.arrange_in_order as ArrangeInOrderQuestion;
    const firstAttempt = createInitialArrangeOrder(question, 0);
    const retry = createInitialArrangeOrder(question, 1);

    expect(retry).not.toEqual(firstAttempt);
    expect(new Set(retry)).toEqual(new Set(question.items.map((item) => item.id)));
  });
});
