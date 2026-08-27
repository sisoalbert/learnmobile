const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export type MonthCalendarDay = {
  completed: boolean;
  frozen?: boolean;
  dateKey: string;
  dayNumber: number;
  inMonth: boolean;
  label: typeof WEEKDAY_NAMES[number];
};

export function buildUtcMonthWeeks(monthKey: string, completedDateKeys: string[], frozenDateKeys: string[] = []): MonthCalendarDay[][] {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return [];

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return [];

  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
  const weekCount = Math.ceil((mondayOffset + daysInMonth) / 7);
  const gridStart = new Date(firstDay);
  gridStart.setUTCDate(firstDay.getUTCDate() - mondayOffset);
  const completed = new Set(completedDateKeys);
  const frozen = new Set(frozenDateKeys);

  return Array.from({ length: weekCount }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex): MonthCalendarDay => {
      const date = new Date(gridStart);
      date.setUTCDate(gridStart.getUTCDate() + weekIndex * 7 + dayIndex);
      const dateKey = date.toISOString().slice(0, 10);

      return {
        completed: completed.has(dateKey),
        frozen: frozen.has(dateKey),
        dateKey,
        dayNumber: date.getUTCDate(),
        inMonth: date.getUTCFullYear() === year && date.getUTCMonth() === monthIndex,
        label: WEEKDAY_NAMES[dayIndex],
      };
    }),
  );
}
