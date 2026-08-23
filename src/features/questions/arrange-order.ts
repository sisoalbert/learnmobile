import type { ArrangeInOrderQuestion } from './questions.types';

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createInitialArrangeOrder(question: ArrangeInOrderQuestion, attempt = 0) {
  const baseOrder = question.items
    .map((item) => item.id)
    .sort((left, right) => {
      const difference = stableHash(`${question.id}:${left}`) - stableHash(`${question.id}:${right}`);
      return difference || left.localeCompare(right);
    });

  if (baseOrder.length < 2) return baseOrder;

  // Published lesson data deliberately excludes the answer key. Rotate the
  // deterministic shuffled order on retries without reading correctOrder,
  // which is only available to the backend grader.
  const offset = attempt % baseOrder.length;
  return [...baseOrder.slice(offset), ...baseOrder.slice(0, offset)];
}
