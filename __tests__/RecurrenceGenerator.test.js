import { RecurrenceGenerator } from '../src/services/RecurrenceGenerator';

const timestamp = (year, month, day) => new Date(year, month - 1, day).getTime();

describe('RecurrenceGenerator', () => {
  it('clamps a monthly interval from the 31st to February month-end', () => {
    expect(RecurrenceGenerator.addInterval(timestamp(2025, 1, 31), 'monthly', 1))
      .toBe(timestamp(2025, 2, 28));
  });

  it.failing('preserves the 31st as the monthly anchor after February', () => {
    const february = RecurrenceGenerator.addInterval(timestamp(2025, 1, 31), 'monthly', 1);
    expect(RecurrenceGenerator.addInterval(february, 'monthly', 1)).toBe(timestamp(2025, 3, 31));
  });

  it('generates only unpaid occurrences within the inclusive date range', () => {
    const recurrences = [{
      id: 4,
      isActive: true,
      startDate: timestamp(2026, 1, 15),
      amount: 30,
      description: 'Streaming',
      type: 'expense',
      frequencyType: 'monthly',
      frequencyInterval: 1
    }];
    const existingTransactions = [{ recurrenceId: 4, iteration: 1, date: timestamp(2026, 2, 15) }];

    expect(RecurrenceGenerator.generateVirtualTransactions(
      recurrences,
      existingTransactions,
      timestamp(2026, 3, 15)
    ).map(({ iteration, date }) => ({ iteration, date }))).toEqual([
      { iteration: 0, date: timestamp(2026, 1, 15) },
      { iteration: 2, date: timestamp(2026, 3, 15) }
    ]);
  });

  it.failing('keeps day-31 monthly occurrences anchored after February', () => {
    const virtuals = RecurrenceGenerator.generateVirtualTransactions([{
      id: 5,
      isActive: true,
      startDate: timestamp(2025, 1, 31),
      amount: 100,
      frequencyType: 'monthly',
      frequencyInterval: 1
    }], [], timestamp(2025, 3, 31));

    expect(virtuals.map(({ date }) => date)).toEqual([
      timestamp(2025, 1, 31),
      timestamp(2025, 2, 28),
      timestamp(2025, 3, 31)
    ]);
  });
});
