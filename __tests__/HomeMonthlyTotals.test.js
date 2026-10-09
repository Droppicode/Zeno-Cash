jest.mock('../src/database/db', () => ({
  db: {},
  expoDb: {
    getAllAsync: jest.fn(),
    runAsync: jest.fn()
  }
}));

import { expoDb } from '../src/database/db';
import { TransactionRepository } from '../src/services/TransactionRepository';

describe('Home monthly income, expense, and balance totals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recalculates monthly balances from non-ignored income and expense totals', async () => {
    expoDb.getAllAsync.mockResolvedValue([{ income: 1000, expense: 325 }]);
    expoDb.runAsync.mockResolvedValue(undefined);

    await TransactionRepository.recalculateMonth(new Date(2026, 0, 15).getTime());

    const [query, bounds] = expoDb.getAllAsync.mock.calls[0];
    expect(query).toContain('type = \'income\' AND is_ignored = 0');
    expect(query).toContain('type = \'expense\' AND is_ignored = 0');
    expect(bounds).toEqual([
      new Date(2026, 0, 1).getTime(),
      new Date(2026, 0, 31, 23, 59, 59, 999).getTime()
    ]);
    expect(expoDb.runAsync.mock.calls[0][1]).toEqual(['2026-01', 1000, 325, 675]);
  });
});
