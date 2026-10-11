import { buildInsights } from '../src/utils/Insights';

const at = (y, m, d) => new Date(y, m - 1, d, 12).getTime();
const NOW = at(2026, 10, 15);
let nextId = 1;
const tx = (y, m, d, amount, extra = {}) => ({ id: nextId++, type: 'expense', amount, date: at(y, m, d), description: 'Diversos', categoryId: null, ...extra });
const kinds = list => list.map(i => i.kind);

describe('buildInsights', () => {
  const restaurants = { id: 1, name: 'Restaurantes', icon: 'restaurant' };

  it('flags a category above its average up to the same day', () => {
    const transactions = [
      tx(2026, 7, 10, 100, { categoryId: 1 }), tx(2026, 8, 10, 100, { categoryId: 1 }), tx(2026, 9, 10, 100, { categoryId: 1 }),
      tx(2026, 9, 25, 500, { categoryId: 1 }),
      tx(2026, 10, 5, 140, { categoryId: 1 }), tx(2026, 10, 12, 60, { categoryId: 1 }),
      tx(2026, 10, 13, 999, { categoryId: 1, isPending: 1 })
    ];
    const [spike] = buildInsights({ transactions, categories: [restaurants], now: NOW }).filter(i => i.kind === 'spike');
    expect(spike.title).toBe('Restaurantes está 100% acima da sua média');
    expect(spike.body).toBe('R$ 200,00 até hoje, contra R$ 100,00 em média até o dia 15 nos últimos 3 meses.');
  });

  it('ignores small increases and categories without history', () => {
    const transactions = [tx(2026, 9, 10, 100, { categoryId: 1 }), tx(2026, 10, 5, 400, { categoryId: 1 })];
    expect(kinds(buildInsights({ transactions, categories: [restaurants], now: NOW }))).not.toContain('spike');
  });

  it('detects a subscription price change', () => {
    const transactions = [
      tx(2026, 8, 3, 39.9, { description: 'Netflix' }), tx(2026, 9, 3, 39.9, { description: 'Netflix' }), tx(2026, 10, 3, 44.9, { description: 'netflix' })
    ];
    const price = buildInsights({ transactions, now: NOW }).find(i => i.kind === 'price');
    expect(price.title).toBe('Netflix subiu de R$ 39,90 para R$ 44,90');
    expect(price.tone).toBe('warning');
  });

  it('warns about a monthly expense that has not shown up yet', () => {
    const transactions = [
      tx(2026, 7, 8, 1650, { description: 'Aluguel' }), tx(2026, 8, 9, 1650, { description: 'Aluguel' }), tx(2026, 9, 10, 1650, { description: 'Aluguel' })
    ];
    const missing = buildInsights({ transactions, now: NOW }).find(i => i.kind === 'missing');
    expect(missing).toMatchObject({ title: 'Aluguel ainda não apareceu este mês', body: 'Costuma cair por volta do dia 9, com R$ 1.650,00.' });
    const withPending = [...transactions, tx(2026, 10, 9, 1650, { description: 'Aluguel', isPending: 1 })];
    expect(kinds(buildInsights({ transactions: withPending, now: NOW }))).not.toContain('missing');
    expect(kinds(buildInsights({ transactions, now: at(2026, 10, 11) }))).not.toContain('missing');
  });

  it('projects month spending against last month', () => {
    const transactions = [tx(2026, 9, 10, 1000), tx(2026, 10, 3, 750)];
    const f = buildInsights({ transactions, now: NOW }).find(i => i.kind === 'forecast');
    expect(f.title).toBe('No ritmo atual, você fecha o mês gastando R$ 1.550,00');
    expect(f.body).toBe('R$ 550,00 a mais que no mês passado (R$ 1.000,00).');
    expect(kinds(buildInsights({ transactions, now: at(2026, 10, 4) }))).not.toContain('forecast');
  });

  it('mentions the oldest open debt owed to the user', () => {
    const debts = [
      { id: 1, personName: 'João', type: 'owed', amount: 76, date: NOW - 45 * 86400000 },
      { id: 2, personName: 'Ana', type: 'owed', amount: 10, date: NOW - 31 * 86400000 },
      { id: 3, personName: 'Bia', type: 'owe', amount: 99, date: NOW - 90 * 86400000 },
      { id: 4, personName: 'Caio', type: 'owed', amount: 10, date: NOW - 90 * 86400000, isPaid: 1 }
    ];
    const debt = buildInsights({ debts, now: NOW }).find(i => i.kind === 'debt');
    expect(debt.title).toBe('João te deve R$ 76,00 há 45 dias');
    expect(debt.body).toBe('E mais 1 dívida(s) a receber paradas há mais de 30 dias.');
  });

  it('counts uncategorized transactions and honours dismissals', () => {
    const transactions = [tx(2026, 10, 1, 5), tx(2026, 10, 2, 5), tx(2026, 10, 3, 5, { type: 'income' })];
    const [insight] = buildInsights({ transactions, now: NOW }).filter(i => i.kind === 'uncategorized');
    expect(insight.title).toBe('3 transações deste mês estão sem categoria');
    expect(kinds(buildInsights({ transactions, dismissed: [insight.id], now: NOW }))).not.toContain('uncategorized');
  });
});
