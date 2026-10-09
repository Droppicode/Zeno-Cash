jest.mock('../src/database/db', () => ({
  db: {
    select: jest.fn(),
    update: jest.fn()
  },
  expoDb: {}
}));

jest.mock('../src/services/TransactionRepository', () => ({
  TransactionRepository: {
    add: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  }
}));

import { db } from '../src/database/db';
import { TransactionRepository } from '../src/services/TransactionRepository';
import { DebtsRepository } from '../src/services/DebtsRepository';

const selectRows = rows => ({
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockResolvedValue(rows)
});

describe('DebtsRepository settlement invoices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.update.mockReturnValue({
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([])
    });
  });

  it('keeps a linked card settlement in the purchase invoice', async () => {
    const debt = {
      id: 7,
      isPaid: 1,
      transactionId: 100,
      recurrenceId: null,
      accountId: 5,
      amount: 12.5,
      type: 'owe',
      personName: 'Ana',
      description: 'Ingresso'
    };
    const card = { id: 5, type: 'credit', closingDay: 15, dueDay: 25 };
    const purchase = {
      id: 100,
      date: new Date(2026, 4, 15).getTime(),
      type: 'expense'
    };
    db.select
      .mockReturnValueOnce(selectRows([debt]))
      .mockReturnValueOnce(selectRows([card]))
      .mockReturnValueOnce(selectRows([purchase]))
      .mockReturnValueOnce(selectRows([]));
    TransactionRepository.add.mockResolvedValue(101);

    await DebtsRepository.update(debt.id, { isPaid: 1 });

    expect(TransactionRepository.add).toHaveBeenCalledWith(expect.objectContaining({
      type: 'expense',
      accountId: card.id,
      note: '[debt:7] [invoice:2026-06]'
    }));
  });
});
