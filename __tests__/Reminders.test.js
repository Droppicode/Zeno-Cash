import { buildReminders } from '../src/utils/Reminders';

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();
const NOW = at(2026, 10, 10, 8);

const card = { id: 2, name: 'Nubank Cartão', type: 'credit', closingDay: 20, dueDay: 28 };
const checking = { id: 1, name: 'Nubank', type: 'checking' };

describe('buildReminders', () => {
  it('reminds N days before and on the due date of invoices with a balance', () => {
    const transactions = [
      { id: 1, accountId: 2, type: 'expense', amount: 200, date: at(2026, 10, 5) },
      { id: 2, accountId: 2, type: 'expense', amount: 999, date: at(2026, 10, 5), isPending: 1 }
    ];
    const reminders = buildReminders({ accounts: [checking, card], transactions, now: NOW });
    expect(reminders.map(r => [r.id, new Date(r.date).getDate(), new Date(r.date).getHours()])).toEqual([
      ['invoice:2:2026-10:3', 25, 9],
      ['invoice:2:2026-10:0', 28, 9]
    ]);
    expect(reminders[0].title).toBe('Fatura Nubank Cartão vence em 3 dias');
    expect(reminders[0].body).toBe('Valor atual: R$ 200,00.');
    expect(reminders[1].title).toBe('Fatura Nubank Cartão vence hoje');
  });

  it('skips paid invoices and respects the days-before setting', () => {
    const paid = [
      { id: 1, accountId: 2, type: 'expense', amount: 200, date: at(2026, 10, 5) },
      { id: 2, accountId: 2, type: 'income', amount: 200, date: at(2026, 10, 9) }
    ];
    expect(buildReminders({ accounts: [card], transactions: paid, now: NOW })).toEqual([]);
    const open = [paid[0]];
    const ids = buildReminders({ accounts: [card], transactions: open, config: { invoiceDaysBefore: 1 }, now: NOW }).map(r => r.id);
    expect(ids).toEqual(['invoice:2:2026-10:1', 'invoice:2:2026-10:0']);
  });

  it('groups recurrences of the same day into one reminder', () => {
    const recurrences = [
      { id: 1, description: 'Aluguel', amount: 1650, type: 'expense', startDate: at(2026, 9, 12), frequencyType: 'monthly', frequencyInterval: 1, isActive: 1 },
      { id: 2, description: 'Netflix', amount: 44.9, type: 'expense', startDate: at(2026, 9, 12), frequencyType: 'monthly', frequencyInterval: 1, isActive: 1 },
      { id: 3, description: 'Pausada', amount: 10, type: 'expense', startDate: at(2026, 9, 12), frequencyType: 'monthly', frequencyInterval: 1, isActive: 0 }
    ];
    const transactions = [
      { id: 10, recurrenceId: 1, amount: 1650, type: 'expense', date: at(2026, 9, 12) },
      { id: 11, recurrenceId: 2, amount: 44.9, type: 'expense', date: at(2026, 9, 12) }
    ];
    const reminders = buildReminders({ recurrences, transactions, now: NOW, config: { debts: false, invoices: false } });
    expect(reminders[0]).toMatchObject({ id: 'recurrence:2026-10-12', title: 'Hoje: 2 recorrências', body: 'Aluguel R$ 1.650,00 · Netflix R$ 44,90' });
    expect(new Date(reminders[0].date).getHours()).toBe(9);
    expect(reminders.every(r => !r.body.includes('Pausada'))).toBe(true);
  });

  it('reminds when an open debt becomes stale and summarizes already stale debts weekly', () => {
    const debts = [
      { id: 1, personName: 'João', type: 'owed', amount: 76, date: at(2026, 8, 1) },
      { id: 2, personName: 'Ana', type: 'owe', amount: 30, date: at(2026, 8, 20) },
      { id: 3, personName: 'Bia', type: 'owed', amount: 50, date: at(2026, 9, 25) },
      { id: 4, personName: 'Caio', type: 'owed', amount: 10, date: at(2026, 8, 1), isPaid: 1 }
    ];
    const reminders = buildReminders({ debts, now: NOW });
    expect(reminders.map(r => r.id)).toEqual(['debt:weekly', 'debt:3']);
    const [weekly, bia] = reminders;
    expect(new Date(weekly.date).getDay()).toBe(1);
    expect(weekly).toMatchObject({ title: '2 dívidas paradas há mais de 30 dias', body: 'No total, te devem R$ 76,00 e você deve R$ 30,00.' });
    expect(new Date(bia.date).getDate()).toBe(25);
    expect(bia.body).toBe('Bia te deve R$ 50,00.');
  });

  it('returns nothing when disabled', () => {
    const debts = [{ id: 1, personName: 'João', type: 'owed', amount: 76, date: at(2026, 8, 1) }];
    expect(buildReminders({ debts, config: { enabled: false }, now: NOW })).toEqual([]);
    expect(buildReminders({ debts, config: { debts: false }, now: NOW })).toEqual([]);
  });
});
