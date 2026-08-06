import { buildUtcMonthWeeks } from '../month-calendar';

describe('UTC month calendar', () => {
  test('creates six Monday-first weeks for August 2026', () => {
    const weeks = buildUtcMonthWeeks('2026-08', ['2026-08-05', '2026-08-06']);

    expect(weeks).toHaveLength(6);
    expect(weeks[0][0]).toMatchObject({ dateKey: '2026-07-27', inMonth: false, label: 'Monday' });
    expect(weeks[1][2]).toMatchObject({ dateKey: '2026-08-05', completed: true, label: 'Wednesday' });
    expect(weeks.at(-1)?.at(-1)).toMatchObject({ dateKey: '2026-09-06', inMonth: false, label: 'Sunday' });
  });

  test('handles a four-week February and leap years without a library', () => {
    expect(buildUtcMonthWeeks('2021-02', [])).toHaveLength(4);
    const leapFebruary = buildUtcMonthWeeks('2024-02', []);
    expect(leapFebruary.flat().filter((day) => day.inMonth)).toHaveLength(29);
  });

  test('rejects invalid month keys', () => {
    expect(buildUtcMonthWeeks('2026-13', [])).toEqual([]);
    expect(buildUtcMonthWeeks('August', [])).toEqual([]);
  });
});
