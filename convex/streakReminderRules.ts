import {
  addDateKeyDays,
  effectiveStreakDays,
  isValidTimezone,
  localDateKey,
} from './streakReminderTime';

export type StreakReminderCandidate = {
  email?: string;
  timezone?: string;
  reminderPreference?: 'enabled' | 'disabled';
  lastPracticeAt?: number;
  lastStreakEmailAt?: number;
  currentStreakDays: number;
  variantIndex?: number;
};

export function streakReminderEligibility(
  candidate: StreakReminderCandidate,
  now = Date.now(),
) {
  if (
    candidate.reminderPreference !== 'enabled'
    || !candidate.email?.trim()
    || !candidate.timezone
    || !isValidTimezone(candidate.timezone)
    || candidate.lastPracticeAt === undefined
  ) return null;

  const today = localDateKey(now, candidate.timezone);
  const practiceDate = localDateKey(candidate.lastPracticeAt, candidate.timezone);
  const sentToday = candidate.lastStreakEmailAt !== undefined
    && localDateKey(candidate.lastStreakEmailAt, candidate.timezone) === today;
  if (
    effectiveStreakDays(
      candidate.currentStreakDays,
      candidate.lastPracticeAt,
      candidate.timezone,
      now,
    ) <= 0
    || practiceDate !== addDateKeyDays(today, -1)
    || sentToday
  ) return null;

  return {
    email: candidate.email.trim(),
    localDate: today,
    streakDays: candidate.currentStreakDays,
    timezone: candidate.timezone,
    variantIndex: Math.abs(candidate.variantIndex ?? 0) % 3,
  };
}
