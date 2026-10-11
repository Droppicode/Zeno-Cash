const rows = {};
const updates = [];
const inserts = [];

jest.mock('../src/database/db', () => {
  const schema = jest.requireActual('../src/database/schema');
  const tableName = table => (table === schema.accounts ? 'accounts' : 'transactions');
  return {
    db: {
      select: () => ({ from: table => ({ where: async () => rows[tableName(table)] }) }),
      update: () => ({ set: data => ({ where: async () => { updates.push(data); } }) }),
      insert: () => ({ values: data => ({ returning: async () => { inserts.push(data); return [{ id: 99, ...data }]; } }) })
    },
    expoDb: { getAllAsync: jest.fn().mockResolvedValue([]), runAsync: jest.fn() }
  };
});

import { TransactionRepository } from '../src/services/TransactionRepository';

const date = new Date(2026, 9, 11).getTime();

describe('approving a card invoice payment notification', () => {
  beforeEach(() => {
    updates.length = 0;
    inserts.length = 0;
    rows.accounts = [{ id: 2, name: 'Cartão Roxo', type: 'credit', closingDay: 20, dueDay: 28 }];
    rows.transactions = [{
      id: 5, amount: 300, type: 'expense', date, accountId: 1, isPending: 1,
      note: 'Pagamento da fatura de R$ 300,00 realizado. [cardpay:2]'
    }];
  });

  it('credits the closed invoice on the card and drops the tag', async () => {
    await TransactionRepository.update(5, { isPending: 0 });
    expect(updates[0]).toEqual({ isPending: 0, note: 'Pagamento da fatura de R$ 300,00 realizado.' });
    expect(inserts).toEqual([{
      amount: 300,
      description: 'Pagamento de Fatura',
      type: 'income',
      date,
      accountId: 2,
      isPending: 0,
      note: '[invoice:2026-09]'
    }]);
  });

  it('uses the edited amount and does nothing for regular approvals', async () => {
    await TransactionRepository.update(5, { isPending: 0, amount: 250, note: 'Fatura [cardpay:2]' });
    expect(inserts[0].amount).toBe(250);
    rows.transactions[0].note = 'Compra';
    inserts.length = 0;
    await TransactionRepository.update(5, { isPending: 0 });
    expect(inserts).toEqual([]);
  });
});
