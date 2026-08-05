const UTC_WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export type UtcWeekDay = {
  dateKey: string;
  label: string;
  completed: boolean;
};

export function buildUtcWeekDays(completedAt: number, completedDateKeys: string[]) {
  const current = new Date(completedAt);
  if (Number.isNaN(current.getTime())) return [];

  const completed = new Set(completedDateKeys);
  const mondayOffset = (current.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(
    current.getUTCFullYear(),
    current.getUTCMonth(),
    current.getUTCDate() - mondayOffset,
  ));

  return Array.from({ length: 7 }, (_, index): UtcWeekDay => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    const dateKey = date.toISOString().slice(0, 10);

    return {
      dateKey,
      label: UTC_WEEKDAY_NAMES[date.getUTCDay()],
      completed: completed.has(dateKey),
    };
  });
}
