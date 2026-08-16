const DAY_MS = 86_400_000;
const REMINDER_HOUR = 19;

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

export function localTimeAt(dateKey: string, hour: number, timezone: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const clockAsUtc = Date.UTC(year, month - 1, day, hour, 0, 0);
  let result = clockAsUtc - timezoneOffsetAt(clockAsUtc, timezone);
  result = clockAsUtc - timezoneOffsetAt(result, timezone);
  return result;
}

export function nextStreakReminderAt(
  lastPracticeAt: number,
  timezone: string,
  now = Date.now(),
) {
  const today = localDateKey(now, timezone);
  const practiceDate = localDateKey(lastPracticeAt, timezone);
  const age = dateKeyDifference(today, practiceDate);
  if (age < 0 || age > 1) return undefined;
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
  return age >= 0 && age <= 1 ? currentDays : 0;
}

export function currentStreakLength(dateKeys: string[], today: string) {
  const uniqueDates = [...new Set(dateKeys)].sort();
  if (!uniqueDates.length) return 0;
  const last = uniqueDates.at(-1)!;
  const age = dateKeyDifference(today, last);
  if (age < 0 || age > 1) return 0;

  const dates = new Set(uniqueDates);
  let cursor = last;
  let count = 0;
  while (dates.has(cursor)) {
    count += 1;
    cursor = addDateKeyDays(cursor, -1);
  }
  return count;
}

export function longestStreakLength(dateKeys: string[]) {
  const uniqueDates = [...new Set(dateKeys)].sort();
  let longest = 0;
  let current = 0;
  let previous: string | undefined;
  for (const dateKey of uniqueDates) {
    current = previous && dateKeyDifference(dateKey, previous) === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = dateKey;
  }
  return longest;
}
