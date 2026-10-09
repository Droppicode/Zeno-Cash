import { calculateGroupStats } from '../src/utils/GroupStats';

const timestamp = (year, month, day) => new Date(year, month - 1, day).getTime();

describe('calculateGroupStats', () => {
  it('returns zeroed statistics for an empty group', () => {
    const now = timestamp(2026, 1, 15);
    expect(calculateGroupStats([], {}, now)).toMatchObject({
      total: 0,
      count: 0,
      firstDate: null,
      lastDate: null,
      monthsSpan: 1,
      monthlyAverage: 0,
      yearlyAverage: 0,
      currentMonthTotal: 0
    });
  });

  it('excludes ignored and pending transactions, while counting an explicit settlement as income', () => {
    const now = timestamp(2026, 5, 20);
    const stats = calculateGroupStats([
      { date: timestamp(2026, 5, 1), type: 'expense', amount: 100 },
      { date: timestamp(2026, 5, 2), type: 'expense', amount: 500, isIgnored: 1 },
      { date: timestamp(2026, 5, 3), type: 'expense', amount: 400, isPending: 1 },
      { date: timestamp(2026, 5, 4), type: 'income', amount: 25, note: '[debt:12]' }
    ], {}, now);

    expect(stats).toMatchObject({ total: 75, count: 2, currentMonthTotal: 75 });
  });

  it('calculates event budget and daily progress', () => {
    const startDate = timestamp(2026, 6, 1);
    const endDate = timestamp(2026, 6, 3);
    const stats = calculateGroupStats([
      { date: startDate, type: 'expense', amount: 50 },
      { date: timestamp(2026, 6, 2), type: 'income', amount: 20 }
    ], { kind: 'event', startDate, endDate, budget: 100 }, startDate);

    expect(stats).toMatchObject({
      total: 30,
      daysSpan: 3,
      dailyAverage: 10,
      budgetUsedPct: 30,
      daysRemaining: 2
    });
  });

  it('uses monthly averages for continuous groups without event-only fields', () => {
    const startDate = timestamp(2026, 1, 1);
    const endDate = timestamp(2026, 3, 1);
    const stats = calculateGroupStats([
      { date: startDate, type: 'expense', amount: 90 }
    ], { kind: 'ongoing', startDate, endDate }, endDate);

    expect(stats.monthlyAverage).toBe(30);
    expect(stats.yearlyAverage).toBe(360);
    expect(stats).not.toHaveProperty('budgetUsedPct');
    expect(stats).not.toHaveProperty('daysSpan');
  });
});
