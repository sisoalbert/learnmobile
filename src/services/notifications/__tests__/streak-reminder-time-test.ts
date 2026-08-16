import {
  currentStreakLength,
  effectiveStreakDays,
  localDateKey,
  localTimeAt,
  longestStreakLength,
  nextStreakReminderAt,
} from '../../../../convex/streakReminderTime';
import { streakReminderEligibility } from '../../../../convex/streakReminderRules';
import {
  nextStreakReminderVariant,
  streakReminderIdempotencyKey,
  streakReminderTemplate,
} from '../../../../convex/streakReminderContent';

describe('streak reminder timezone rules', () => {
  test('schedules the at-risk reminder for 19:00 in Johannesburg', () => {
    const practicedMonday = Date.parse('2026-08-17T10:00:00Z');
    const tuesdayBeforeReminder = Date.parse('2026-08-18T16:59:00Z');

    expect(nextStreakReminderAt(
      practicedMonday,
      'Africa/Johannesburg',
      tuesdayBeforeReminder,
    )).toBe(Date.parse('2026-08-18T17:00:00Z'));
  });

  test('keeps an overdue reminder due and moves today practice to tomorrow', () => {
    const monday = Date.parse('2026-08-17T10:00:00Z');
    const tuesdayAfterReminder = Date.parse('2026-08-18T17:20:00Z');
    expect(nextStreakReminderAt(monday, 'Africa/Johannesburg', tuesdayAfterReminder))
      .toBe(Date.parse('2026-08-18T17:00:00Z'));

    const tuesdayPractice = Date.parse('2026-08-18T12:00:00Z');
    expect(nextStreakReminderAt(tuesdayPractice, 'Africa/Johannesburg', tuesdayAfterReminder))
      .toBe(Date.parse('2026-08-19T17:00:00Z'));
  });

  test('expires stale streaks instead of scheduling another reminder', () => {
    const practicedMonday = Date.parse('2026-08-17T10:00:00Z');
    const wednesday = Date.parse('2026-08-19T10:00:00Z');
    expect(nextStreakReminderAt(practicedMonday, 'Africa/Johannesburg', wednesday))
      .toBeUndefined();
    expect(effectiveStreakDays(12, practicedMonday, 'Africa/Johannesburg', wednesday)).toBe(0);
  });

  test('uses the correct offset before and after New York DST changes', () => {
    expect(localTimeAt('2026-03-08', 19, 'America/New_York'))
      .toBe(Date.parse('2026-03-08T23:00:00Z'));
    expect(localTimeAt('2026-11-01', 19, 'America/New_York'))
      .toBe(Date.parse('2026-11-02T00:00:00Z'));
  });

  test('derives local dates at the UTC boundary', () => {
    const timestamp = Date.parse('2026-08-18T22:30:00Z');
    expect(localDateKey(timestamp, 'Africa/Johannesburg')).toBe('2026-08-19');
    expect(localDateKey(timestamp, 'America/New_York')).toBe('2026-08-18');
  });

  test('rebuilds current and longest streaks from distinct local dates', () => {
    const dates = ['2026-08-10', '2026-08-11', '2026-08-13', '2026-08-14', '2026-08-15'];
    expect(longestStreakLength(dates)).toBe(3);
    expect(currentStreakLength(dates, '2026-08-16')).toBe(3);
    expect(currentStreakLength(dates, '2026-08-17')).toBe(0);
  });

  test('requires an active streak, yesterday practice, consent, and no send today', () => {
    const now = Date.parse('2026-08-18T17:00:00Z');
    const eligible = {
      email: 'rex@example.com',
      timezone: 'Africa/Johannesburg',
      reminderPreference: 'enabled' as const,
      lastPracticeAt: Date.parse('2026-08-17T10:00:00Z'),
      currentStreakDays: 7,
      variantIndex: 1,
    };
    expect(streakReminderEligibility(eligible, now)).toMatchObject({
      email: 'rex@example.com',
      localDate: '2026-08-18',
      streakDays: 7,
      variantIndex: 1,
    });
    expect(streakReminderEligibility({ ...eligible, currentStreakDays: 0 }, now)).toBeNull();
    expect(streakReminderEligibility({ ...eligible, reminderPreference: 'disabled' }, now)).toBeNull();
    expect(streakReminderEligibility({ ...eligible, lastPracticeAt: now }, now)).toBeNull();
    expect(streakReminderEligibility({ ...eligible, lastStreakEmailAt: now }, now)).toBeNull();
  });

  test('rotates 05, 07, and 10 and uses a stable per-day idempotency key', () => {
    expect(streakReminderTemplate(0).id).toBe('streak_reminder_05');
    expect(streakReminderTemplate(nextStreakReminderVariant(0)).id).toBe('streak_reminder_07');
    expect(streakReminderTemplate(nextStreakReminderVariant(1)).id).toBe('streak_reminder_10');
    expect(nextStreakReminderVariant(2)).toBe(0);
    expect(streakReminderIdempotencyKey('user-123', '2026-08-18'))
      .toBe('streak-reminder/user-123/2026-08-18');
  });
});
