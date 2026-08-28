import {
  dateKeyDifference,
  isValidTimezone,
  localDateKey,
  MAX_STREAK_FREEZE_DAYS,
  type StreakFreezeDay,
} from './streakReminderTime';

export type StreakReminderCandidate = {
  timezone?: string;
  reminderPreference?: 'enabled' | 'disabled';
  lastPracticeAt?: number;
  lastQualifiedDate?: string;
  currentStreakDays: number;
};

export function hasStreakReminderTarget(target: string | undefined) {
  return Boolean(target?.trim());
}

export function sentStreakReminderOnLocalDate(
  sentAt: number | undefined,
  timezone: string | undefined,
  localDate: string,
) {
  return sentAt !== undefined
    && timezone !== undefined
    && isValidTimezone(timezone)
    && localDateKey(sentAt, timezone) === localDate;
}

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
  const practiceDate = candidate.lastQualifiedDate
    ?? localDateKey(candidate.lastPracticeAt, candidate.timezone);
  const freezeDay = dateKeyDifference(today, practiceDate);
  if (
    candidate.currentStreakDays <= 0
    || freezeDay < 1
    || freezeDay > MAX_STREAK_FREEZE_DAYS
  ) return null;

  return {
    localDate: today,
    streakDays: candidate.currentStreakDays,
    timezone: candidate.timezone,
    freezeDay: freezeDay as StreakFreezeDay,
  };
}
