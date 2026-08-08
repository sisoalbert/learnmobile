import { ConvexError } from 'convex/values';

export const INVALID_LEARNER_CREDENTIAL = 'INVALID_LEARNER_CREDENTIAL';
export const LEARNER_ALREADY_MERGED = 'LEARNER_ALREADY_MERGED';

export function isInvalidLearnerCredential(error: unknown) {
  if (error instanceof ConvexError) {
    const data = error.data;
    if (typeof data === 'object' && data !== null && 'code' in data) {
      return data.code === INVALID_LEARNER_CREDENTIAL || data.code === LEARNER_ALREADY_MERGED;
    }
    return data === INVALID_LEARNER_CREDENTIAL || data === LEARNER_ALREADY_MERGED;
  }

  return error instanceof Error && (
    error.message.includes(INVALID_LEARNER_CREDENTIAL) ||
    error.message.includes(LEARNER_ALREADY_MERGED)
  );
}

