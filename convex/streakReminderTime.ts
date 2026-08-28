const DAY_MS = 86_400_000;
const REMINDER_HOUR = 19;
const PUSH_REMINDER_HOUR = 20;
const PUSH_REMINDER_MINUTE = 0;

export const MAX_STREAK_FREEZE_DAYS = 3;
export type StreakFreezeDay = 1 | 2 | 3;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timezone: string) {
  const cached = formatterCache.get(timezone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  formatterCache.set(timezone, formatter);
  return formatter;
}

function zonedParts(timestamp: number, timezone: string) {
  const parts = formatterFor(timezone).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts.flatMap((part) => part.type === 'literal' ? [] : [[part.type, Number(part.value)]]),
  );
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function timezoneOffsetAt(timestamp: number, timezone: string) {
  const parts = zonedParts(timestamp, timezone);
  const timestampToSecond = Math.floor(timestamp / 1000) * 1000;
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  ) - timestampToSecond;
}

export function isValidTimezone(timezone: string) {
  if (!timezone.trim()) return false;
  try {
    formatterFor(timezone).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

export function localDateKey(timestamp: number, timezone: string) {
  const { year, month, day } = zonedParts(timestamp, timezone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function addDateKeyDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function dateKeyDifference(left: string, right: string) {
  return Math.round(
    (Date.parse(`${left}T00:00:00Z`) - Date.parse(`${right}T00:00:00Z`)) / DAY_MS,
  );
}

export function localTimeAt(dateKey: string, hour: number, timezone: string, minute = 0) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const clockAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let result = clockAsUtc - timezoneOffsetAt(clockAsUtc, timezone);
  result = clockAsUtc - timezoneOffsetAt(result, timezone);
  return result;
}

export function nextStreakPushReminderAt(
  lastPracticeAt: number,
  timezone: string,
  now = Date.now(),
) {
  const today = localDateKey(now, timezone);
  const practiceDate = localDateKey(lastPracticeAt, timezone);
  const age = dateKeyDifference(today, practiceDate);
  if (age < 0 || age > MAX_STREAK_FREEZE_DAYS) return undefined;
  const reminderDate = age === 0 ? addDateKeyDays(today, 1) : today;
  return localTimeAt(reminderDate, PUSH_REMINDER_HOUR, timezone, PUSH_REMINDER_MINUTE);
}

export function nextStreakReminderAt(
  lastPracticeAt: number,
  timezone: string,
  now = Date.now(),
) {
  const today = localDateKey(now, timezone);
  const practiceDate = localDateKey(lastPracticeAt, timezone);
  const age = dateKeyDifference(today, practiceDate);
  if (age < 0 || age > MAX_STREAK_FREEZE_DAYS) return undefined;
  const reminderDate = age === 0 ? addDateKeyDays(today, 1) : today;
  return localTimeAt(reminderDate, REMINDER_HOUR, timezone);
}

export function effectiveStreakDays(
  currentDays: number,
  lastPracticeAt: number | undefined,
  timezone: string,
  now = Date.now(),
) {
  if (currentDays <= 0 || lastPracticeAt === undefined) return 0;
  const age = dateKeyDifference(
    localDateKey(now, timezone),
    localDateKey(lastPracticeAt, timezone),
  );
  return age >= 0 && age <= MAX_STREAK_FREEZE_DAYS ? currentDays : 0;
}

export function streakFreezeState(
  currentDays: number,
  lastQualifiedDate: string | undefined,
  today: string,
) {
  if (currentDays <= 0 || !lastQualifiedDate) {
    return {
      currentDays: 0,
      frozenDaysUsed: 0,
      freezeStartedDate: undefined,
      freezeDay: undefined,
      expired: false,
    };
  }

  const age = dateKeyDifference(today, lastQualifiedDate);
  if (age <= 0) {
    return {
      currentDays,
      frozenDaysUsed: 0,
      freezeStartedDate: undefined,
      freezeDay: undefined,
      expired: false,
    };
  }

  const freezeStartedDate = addDateKeyDays(lastQualifiedDate, 1);
  if (age <= MAX_STREAK_FREEZE_DAYS) {
    return {
      currentDays,
      frozenDaysUsed: age,
      freezeStartedDate,
      freezeDay: age as StreakFreezeDay,
      expired: false,
    };
  }

  return {
    currentDays: 0,
    frozenDaysUsed: MAX_STREAK_FREEZE_DAYS,
    freezeStartedDate,
    freezeDay: undefined,
    expired: true,
  };
}

export function streakDaysAfterPractice(
  currentDays: number,
  lastQualifiedDate: string | undefined,
  practiceDate: string,
) {
  if (!lastQualifiedDate || currentDays <= 0) return 1;
  const difference = dateKeyDifference(practiceDate, lastQualifiedDate);
  if (difference === 0) return currentDays;
  return difference > 0 && difference <= MAX_STREAK_FREEZE_DAYS
    ? currentDays + 1
    : 1;
}

export function currentStreakLength(dateKeys: string[], today: string) {
  const uniqueDates = [...new Set(dateKeys)].sort();
  if (!uniqueDates.length) return 0;
  const last = uniqueDates.at(-1)!;
  const age = dateKeyDifference(today, last);
  if (age < 0 || age > MAX_STREAK_FREEZE_DAYS) return 0;

  let count = 1;
  for (let index = uniqueDates.length - 1; index > 0; index -= 1) {
    if (dateKeyDifference(uniqueDates[index], uniqueDates[index - 1]) > MAX_STREAK_FREEZE_DAYS) {
      break;
    }
    count += 1;
  }
  return count;
}

export function longestStreakLength(dateKeys: string[]) {
  const uniqueDates = [...new Set(dateKeys)].sort();
  let longest = 0;
  let current = 0;
  let previous: string | undefined;
  for (const dateKey of uniqueDates) {
    const difference = previous ? dateKeyDifference(dateKey, previous) : undefined;
    current = difference !== undefined
      && difference > 0
      && difference <= MAX_STREAK_FREEZE_DAYS
      ? current + 1
      : 1;
    longest = Math.max(longest, current);
    previous = dateKey;
  }
  return longest;
}
