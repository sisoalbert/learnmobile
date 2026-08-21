import type { ArrangeInOrderQuestion } from './questions.types';

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function arraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function createInitialArrangeOrder(question: ArrangeInOrderQuestion, attempt = 0) {
  const baseOrder = question.items
    .map((item) => item.id)
    .sort((left, right) => {
      const difference = stableHash(`${question.id}:${left}`) - stableHash(`${question.id}:${right}`);
      return difference || left.localeCompare(right);
    });

  if (baseOrder.length < 2) return baseOrder;

  const incorrectRotations = baseOrder
    .map((_, offset) => [...baseOrder.slice(offset), ...baseOrder.slice(0, offset)])
    .filter((candidate) => !arraysEqual(candidate, question.correctOrder));

  return incorrectRotations[attempt % incorrectRotations.length];
}
