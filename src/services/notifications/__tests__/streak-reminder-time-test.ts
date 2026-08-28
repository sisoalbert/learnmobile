import {
  currentStreakLength,
  effectiveStreakDays,
  localDateKey,
  localTimeAt,
  longestStreakLength,
  nextStreakReminderAt,
  nextStreakPushReminderAt,
  streakDaysAfterPractice,
  streakFreezeState,
} from '../../../../convex/streakReminderTime';
import {
  hasStreakReminderTarget,
  sentStreakReminderOnLocalDate,
  streakReminderEligibility,
} from '../../../../convex/streakReminderRules';
import {
  streakReminderIdempotencyKey,
  streakReminderTemplate,
} from '../../../../convex/streakReminderContent';

describe('three-day streak freeze rules', () => {
  const practicedMonday = Date.parse('2026-08-17T10:00:00Z');
  const timezone = 'Africa/Johannesburg';

  test('schedules email at 19:00 and push at 20:00 on each freeze day', () => {
    for (const [date, emailUtc, pushUtc] of [
      ['2026-08-18T10:00:00Z', '2026-08-18T17:00:00Z', '2026-08-18T18:00:00Z'],
      ['2026-08-19T10:00:00Z', '2026-08-19T17:00:00Z', '2026-08-19T18:00:00Z'],
      ['2026-08-20T10:00:00Z', '2026-08-20T17:00:00Z', '2026-08-20T18:00:00Z'],
    ]) {
      const now = Date.parse(date);
      expect(nextStreakReminderAt(practicedMonday, timezone, now)).toBe(Date.parse(emailUtc));
      expect(nextStreakPushReminderAt(practicedMonday, timezone, now)).toBe(Date.parse(pushUtc));
    }
  });

  test('keeps an overdue reminder due and schedules tomorrow after practice today', () => {
    const tuesdayAfterReminder = Date.parse('2026-08-18T17:20:00Z');
    expect(nextStreakReminderAt(practicedMonday, timezone, tuesdayAfterReminder))
      .toBe(Date.parse('2026-08-18T17:00:00Z'));
    const tuesdayPractice = Date.parse('2026-08-18T12:00:00Z');
    expect(nextStreakReminderAt(tuesdayPractice, timezone, tuesdayAfterReminder))
      .toBe(Date.parse('2026-08-19T17:00:00Z'));
  });

  test('preserves days 1-3 and expires on the fourth missed local date', () => {
    expect(streakFreezeState(5, '2026-08-17', '2026-08-18')).toMatchObject({
      currentDays: 5, frozenDaysUsed: 1, freezeStartedDate: '2026-08-18', freezeDay: 1, expired: false,
    });
    expect(streakFreezeState(5, '2026-08-17', '2026-08-19')).toMatchObject({
      currentDays: 5, frozenDaysUsed: 2, freezeDay: 2,
    });
    expect(streakFreezeState(5, '2026-08-17', '2026-08-20')).toMatchObject({
      currentDays: 5, frozenDaysUsed: 3, freezeDay: 3,
    });
    expect(streakFreezeState(5, '2026-08-17', '2026-08-21')).toMatchObject({
      currentDays: 0, frozenDaysUsed: 3, expired: true,
    });
    expect(nextStreakReminderAt(practicedMonday, timezone, Date.parse('2026-08-21T10:00:00Z')))
      .toBeUndefined();
  });

  test.each([
    ['first', '2026-08-18'],
    ['second', '2026-08-19'],
    ['third', '2026-08-20'],
  ])('continues the streak when returning on the %s freeze day', (_label, date) => {
    expect(streakDaysAfterPractice(5, '2026-08-17', date)).toBe(6);
  });

  test('resets after expiry and clears freeze state after practice', () => {
    expect(streakDaysAfterPractice(5, '2026-08-17', '2026-08-21')).toBe(1);
    expect(streakFreezeState(1, '2026-08-21', '2026-08-21')).toMatchObject({
      currentDays: 1, frozenDaysUsed: 0, freezeStartedDate: undefined,
    });
  });

  test('uses local calendar boundaries and DST offsets at both delivery times', () => {
    const timestamp = Date.parse('2026-08-18T22:30:00Z');
    expect(localDateKey(timestamp, 'Africa/Johannesburg')).toBe('2026-08-19');
    expect(localDateKey(timestamp, 'America/New_York')).toBe('2026-08-18');
    expect(localTimeAt('2026-03-08', 19, 'America/New_York')).toBe(Date.parse('2026-03-08T23:00:00Z'));
    expect(localTimeAt('2026-03-08', 20, 'America/New_York')).toBe(Date.parse('2026-03-09T00:00:00Z'));
    expect(localTimeAt('2026-11-01', 19, 'America/New_York')).toBe(Date.parse('2026-11-02T00:00:00Z'));
    expect(localTimeAt('2026-11-01', 20, 'America/New_York')).toBe(Date.parse('2026-11-02T01:00:00Z'));
  });

  test('rebuilds current and longest streaks with freezes between lesson dates', () => {
    const dates = ['2026-08-10', '2026-08-11', '2026-08-13', '2026-08-14', '2026-08-15'];
    expect(longestStreakLength(dates)).toBe(5);
    expect(currentStreakLength(dates, '2026-08-18')).toBe(5);
    expect(currentStreakLength(dates, '2026-08-19')).toBe(0);
    expect(effectiveStreakDays(5, Date.parse('2026-08-15T10:00:00Z'), timezone, Date.parse('2026-08-18T10:00:00Z'))).toBe(5);
  });

  test('allows each freeze day and rejects completed, disabled, and expired candidates', () => {
    const candidate = {
      timezone,
      reminderPreference: 'enabled' as const,
      lastPracticeAt: practicedMonday,
      lastQualifiedDate: '2026-08-17',
      currentStreakDays: 7,
    };
    for (const [now, freezeDay] of [
      ['2026-08-18T17:00:00Z', 1],
      ['2026-08-19T17:00:00Z', 2],
      ['2026-08-20T17:00:00Z', 3],
    ] as const) {
      expect(streakReminderEligibility(candidate, Date.parse(now))).toMatchObject({ streakDays: 7, freezeDay });
    }
    expect(streakReminderEligibility({ ...candidate, reminderPreference: 'disabled' }, Date.parse('2026-08-18T17:00:00Z'))).toBeNull();
    expect(streakReminderEligibility({
      ...candidate,
      lastQualifiedDate: '2026-08-18',
      lastPracticeAt: Date.parse('2026-08-18T10:00:00Z'),
    }, Date.parse('2026-08-18T17:00:00Z'))).toBeNull();
    expect(streakReminderEligibility(candidate, Date.parse('2026-08-21T17:00:00Z'))).toBeNull();
  });

  test('requires a target and allows at most one send per channel and local date', () => {
    expect(hasStreakReminderTarget('learner@example.com')).toBe(true);
    expect(hasStreakReminderTarget('ExponentPushToken[token]')).toBe(true);
    expect(hasStreakReminderTarget(undefined)).toBe(false);
    expect(hasStreakReminderTarget('  ')).toBe(false);
    const date = '2026-08-18';
    const sentAt = Date.parse('2026-08-18T17:00:00Z');
    expect(sentStreakReminderOnLocalDate(undefined, timezone, date)).toBe(false);
    expect(sentStreakReminderOnLocalDate(sentAt, timezone, date)).toBe(true);
    expect(sentStreakReminderOnLocalDate(sentAt, timezone, '2026-08-19')).toBe(false);
  });

  test('uses matching daily content and stable date idempotency', () => {
    expect(streakReminderTemplate(1)).toMatchObject({ subject: 'Your streak is protected tonight 🔥', cta: 'SAVE MY STREAK' });
    expect(streakReminderTemplate(2).subject).toBe('Your streak is frozen — 2 days left ❄️');
    expect(streakReminderTemplate(3)).toMatchObject({ subject: 'Final freeze day for your streak ⏳', cta: 'START A LESSON' });
    expect(streakReminderIdempotencyKey('user-123', '2026-08-18')).toBe('streak-reminder/user-123/2026-08-18');
  });
});
