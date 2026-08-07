import { ConvexError } from 'convex/values';

export const INVALID_LEARNER_CREDENTIAL = 'INVALID_LEARNER_CREDENTIAL';

export function isInvalidLearnerCredential(error: unknown) {
  if (error instanceof ConvexError) {
    const data = error.data;
    if (typeof data === 'object' && data !== null && 'code' in data) {
      return data.code === INVALID_LEARNER_CREDENTIAL;
    }
    return data === INVALID_LEARNER_CREDENTIAL;
  }

  return error instanceof Error && error.message.includes(INVALID_LEARNER_CREDENTIAL);
}
