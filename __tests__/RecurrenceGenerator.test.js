import { RecurrenceGenerator } from '../src/services/RecurrenceGenerator';

const timestamp = (year, month, day) => new Date(year, month - 1, day).getTime();
const timestampAt = (year, month, day, hour, minute) => new Date(year, month - 1, day, hour, minute).getTime();

describe('RecurrenceGenerator', () => {
  it('clamps a monthly interval from the 31st to February month-end', () => {
    expect(RecurrenceGenerator.addInterval(timestamp(2025, 1, 31), 'monthly', 1))
      .toBe(timestamp(2025, 2, 28));
  });

  it('preserves the 31st as the monthly anchor after February', () => {
    const startDate = timestamp(2025, 1, 31);
    expect(RecurrenceGenerator.occurrenceAt(startDate, 'monthly', 1, 1)).toBe(timestamp(2025, 2, 28));
    expect(RecurrenceGenerator.occurrenceAt(startDate, 'monthly', 1, 2)).toBe(timestamp(2025, 3, 31));
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

  it('keeps day-31 monthly occurrences anchored after February', () => {
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

  it('preserves the start time for monthly occurrences', () => {
    const startDate = timestampAt(2025, 1, 31, 14, 45);
    expect([
      RecurrenceGenerator.occurrenceAt(startDate, 'monthly', 1, 1),
      RecurrenceGenerator.occurrenceAt(startDate, 'monthly', 1, 2)
    ]).toEqual([
      timestampAt(2025, 2, 28, 14, 45),
      timestampAt(2025, 3, 31, 14, 45)
    ]);
  });

  it('matches an existing materialized February 28 occurrence by date', () => {
    const virtuals = RecurrenceGenerator.generateVirtualTransactions([{
      id: 6,
      isActive: true,
      startDate: timestamp(2025, 1, 31),
      amount: 100,
      frequencyType: 'monthly',
      frequencyInterval: 1
    }], [
      { recurrenceId: 6, date: timestamp(2025, 1, 31) },
      { recurrenceId: 6, date: timestamp(2025, 2, 28) }
    ], timestamp(2025, 3, 31));

    expect(virtuals.map(({ date }) => date)).toEqual([timestamp(2025, 3, 31)]);
  });

  it('keeps yearly February 29 recurrences anchored through leap years', () => {
    const startDate = timestampAt(2024, 2, 29, 9, 15);
    const virtuals = RecurrenceGenerator.generateVirtualTransactions([{
      id: 7,
      isActive: true,
      startDate,
      amount: 100,
      frequencyType: 'yearly',
      frequencyInterval: 1
    }], [], timestampAt(2028, 2, 29, 9, 15));

    expect(virtuals.map(({ date }) => date)).toEqual([
      timestampAt(2024, 2, 29, 9, 15),
      timestampAt(2025, 2, 28, 9, 15),
      timestampAt(2026, 2, 28, 9, 15),
      timestampAt(2027, 2, 28, 9, 15),
      timestampAt(2028, 2, 29, 9, 15)
    ]);
  });
});
