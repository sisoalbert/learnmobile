import {
  addDateKeyDays,
  effectiveStreakDays,
  isValidTimezone,
  localDateKey,
} from './streakReminderTime';

export type StreakReminderCandidate = {
  timezone?: string;
  reminderPreference?: 'enabled' | 'disabled';
  lastPracticeAt?: number;
  currentStreakDays: number;
};

export function streakReminderEligibility(
  candidate: StreakReminderCandidate,
  now = Date.now(),
) {
  if (
    candidate.reminderPreference !== 'enabled'
    || !candidate.timezone
    || !isValidTimezone(candidate.timezone)
    || candidate.lastPracticeAt === undefined
  ) return null;

  const today = localDateKey(now, candidate.timezone);
  const practiceDate = localDateKey(candidate.lastPracticeAt, candidate.timezone);
  if (
    effectiveStreakDays(
      candidate.currentStreakDays,
      candidate.lastPracticeAt,
      candidate.timezone,
      now,
    ) <= 0
    || practiceDate !== addDateKeyDays(today, -1)
  ) return null;

  return {
    localDate: today,
    streakDays: candidate.currentStreakDays,
    timezone: candidate.timezone,
  };
}
