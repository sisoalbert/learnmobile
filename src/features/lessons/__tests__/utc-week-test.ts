import { buildUtcWeekDays } from '../utc-week';

describe('UTC weekly activity', () => {
  test('builds Monday through Sunday and completes Wednesday', () => {
    const days = buildUtcWeekDays(
      Date.parse('2026-08-05T12:00:00Z'),
      ['2026-08-05'],
    );

    expect(days.map((day) => day.label)).toEqual([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ]);
    expect(days[0]).toMatchObject({ dateKey: '2026-08-03', completed: false });
    expect(days[2]).toMatchObject({ dateKey: '2026-08-05', completed: true });
    expect(days[6]).toMatchObject({ dateKey: '2026-08-09', completed: false });
  });

  test.each([
    ['2026-08-03T00:00:00Z', '2026-08-03', '2026-08-09'],
    ['2026-08-09T23:59:59Z', '2026-08-03', '2026-08-09'],
  ])('keeps %s inside the correct UTC week', (timestamp, monday, sunday) => {
    const days = buildUtcWeekDays(Date.parse(timestamp), []);

    expect(days[0].dateKey).toBe(monday);
    expect(days[6].dateKey).toBe(sunday);
  });

  test('returns no days for an invalid completion timestamp', () => {
    expect(buildUtcWeekDays(Number.NaN, ['2026-08-05'])).toEqual([]);
  });
});
