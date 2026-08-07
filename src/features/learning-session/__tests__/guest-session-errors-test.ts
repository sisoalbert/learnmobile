import { ConvexError } from 'convex/values';

import { isInvalidLearnerCredential } from '../guest-session-errors';

describe('guest session errors', () => {
  test('recognizes structured Convex credential errors', () => {
    expect(isInvalidLearnerCredential(
      new ConvexError({ code: 'INVALID_LEARNER_CREDENTIAL' }),
    )).toBe(true);
  });

  test('recognizes legacy server messages during rollout', () => {
    expect(isInvalidLearnerCredential(
      new Error('[CONVEX] Uncaught Error: INVALID_LEARNER_CREDENTIAL'),
    )).toBe(true);
  });

  test('does not classify connectivity or unrelated server failures as invalid credentials', () => {
    expect(isInvalidLearnerCredential(new Error('Network request failed'))).toBe(false);
    expect(isInvalidLearnerCredential(new ConvexError({ code: 'UNAUTHENTICATED' }))).toBe(false);
  });
});
