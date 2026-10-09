jest.mock('../src/database/db', () => ({
  db: {},
  expoDb: {
    getAllAsync: jest.fn(),
    runAsync: jest.fn()
  }
}));

import { expoDb } from '../src/database/db';
import { MONTHLY_BALANCES_VERSION, TransactionRepository } from '../src/services/TransactionRepository';

const dateInMonth = (year, month, day) => new Date(year, month - 1, day).getTime();

describe('monthly balance cache rebuilds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes and rebuilds every transaction month when the stored version is outdated', async () => {
    const transactionDates = [
      dateInMonth(2026, 1, 5),
      dateInMonth(2026, 1, 21),
      dateInMonth(2026, 2, 8)
    ];
    expoDb.getAllAsync.mockImplementation(async query => {
      if (query.includes('SELECT value FROM settings')) return [{ value: '1' }];
      if (query.includes('COUNT(*)')) return [{ c: 2 }];
      if (query.includes('SELECT date FROM transactions')) {
        return transactionDates.map(date => ({ date }));
      }
      if (query.includes('SUM(CASE')) return [{ income: 250, expense: 50 }];
      return [];
    });
    expoDb.runAsync.mockResolvedValue(undefined);

    await TransactionRepository.initMonthlyBalances();

    expect(expoDb.runAsync.mock.calls[0]).toEqual(['DELETE FROM monthly_balances']);
    const monthlyRecalculations = expoDb.getAllAsync.mock.calls.filter(([query]) => query.includes('SUM(CASE'));
    expect(monthlyRecalculations).toHaveLength(2);
    expect(monthlyRecalculations.map(([, bounds]) => bounds)).toEqual([
      [new Date(2026, 0, 1).getTime(), new Date(2026, 1, 0, 23, 59, 59, 999).getTime()],
      [new Date(2026, 1, 1).getTime(), new Date(2026, 2, 0, 23, 59, 59, 999).getTime()]
    ]);
    expect(expoDb.runAsync).toHaveBeenLastCalledWith(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      ['monthly_balances_version', String(MONTHLY_BALANCES_VERSION)]
    );
  });

  it('does not rebuild when the stored version is current and the cache is populated', async () => {
    expoDb.getAllAsync
      .mockResolvedValueOnce([{ value: String(MONTHLY_BALANCES_VERSION) }])
      .mockResolvedValueOnce([{ c: 3 }]);

    await TransactionRepository.initMonthlyBalances();

    expect(expoDb.getAllAsync).toHaveBeenCalledTimes(2);
    expect(expoDb.runAsync).not.toHaveBeenCalled();
  });

  it('recalculates each distinct transaction month once during a full rebuild', async () => {
    expoDb.getAllAsync.mockImplementation(async query => {
      if (query === 'SELECT date FROM transactions') {
        return [
          { date: dateInMonth(2026, 3, 2) },
          { date: dateInMonth(2026, 3, 28) },
          { date: dateInMonth(2026, 4, 12) }
        ];
      }
      if (query.includes('SUM(CASE')) return [{ income: 0, expense: 0 }];
      return [];
    });
    expoDb.runAsync.mockResolvedValue(undefined);

    await TransactionRepository.rebuildAllMonthlyBalances();

    const monthlyRecalculations = expoDb.getAllAsync.mock.calls.filter(([query]) => query.includes('SUM(CASE'));
    expect(monthlyRecalculations).toHaveLength(2);
    expect(expoDb.runAsync).toHaveBeenCalledTimes(4);
    expect(expoDb.runAsync.mock.calls[0]).toEqual(['DELETE FROM monthly_balances']);
  });
});
