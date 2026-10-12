import { budgetLevel, computeMacroBudgets, listMacros, newBudgetAlerts } from '../src/utils/MacroBudgets';

const food = { id: 1, name: 'Alimentação', macro: 'Essenciais' };
const market = { id: 2, name: 'Mercado', macro: 'Essenciais' };
const fun = { id: 3, name: 'Lazer', macro: 'Estilo de Vida' };
const misc = { id: 4, name: 'Diversos', macro: null };
const categories = [food, market, fun, misc];
const limits = { Essenciais: 500, 'Estilo de Vida': 200 };
const d = (y, m, day) => new Date(y, m - 1, day, 12).getTime();

const txs = [
  { id: 1, categoryId: 1, type: 'expense', amount: 300, date: d(2026, 10, 2) },
  { id: 2, categoryId: 2, type: 'expense', amount: 150, date: d(2026, 10, 9) },
  { id: 3, categoryId: 1, type: 'expense', amount: 999, date: d(2026, 10, 9), isPending: 1 },
  { id: 4, categoryId: 2, type: 'expense', amount: 999, date: d(2026, 10, 9), isIgnored: 1 },
  { id: 5, categoryId: 1, type: 'expense', amount: 400, date: d(2026, 9, 20) },
  { id: 6, categoryId: 1, type: 'income', amount: 50, date: d(2026, 10, 10), note: 'Acerto [debt:7]' },
  { id: 7, categoryId: 1, type: 'income', amount: 1000, date: d(2026, 10, 10) },
  { id: 8, categoryId: 3, type: 'expense', amount: 250, date: d(2026, 10, 5) },
  { id: 9, categoryId: 4, type: 'expense', amount: 80, date: d(2026, 10, 5) }
];

describe('listMacros', () => {
  it('keeps configured order, adds macros used by categories and ends with Outros', () => {
    expect(listMacros(['Essenciais', 'Investimento'], [...categories, { id: 5, macro: 'Viagem' }]))
      .toEqual(['Essenciais', 'Investimento', 'Estilo de Vida', 'Viagem', 'Outros']);
  });
});

describe('computeMacroBudgets', () => {
  it('sums approved expenses of every category in the macro, minus debt settlements', () => {
    const result = computeMacroBudgets(categories, txs, ['2026-10'], limits, ['Essenciais', 'Estilo de Vida']);
    expect(result.map(b => b.macro)).toEqual(['Essenciais', 'Estilo de Vida']);
    expect(result[0]).toMatchObject({ spent: 400, limit: 500, ratio: 0.8 });
    expect(result[1]).toMatchObject({ spent: 250, limit: 200, ratio: 1.25 });
  });

  it('groups categories without a macro under Outros', () => {
    const [other] = computeMacroBudgets(categories, txs, ['2026-10'], { Outros: 100 });
    expect(other).toMatchObject({ macro: 'Outros', spent: 80, limit: 100 });
  });

  it('scales the limit with the number of selected months', () => {
    const [essentials] = computeMacroBudgets(categories, txs, ['2026-09', '2026-10'], { Essenciais: 500 });
    expect(essentials).toMatchObject({ spent: 800, limit: 1000 });
  });

  it('never reports negative spending', () => {
    const [essentials] = computeMacroBudgets(categories, [txs[5]], ['2026-10'], { Essenciais: 500 });
    expect(essentials.spent).toBe(0);
  });
});

describe('budget levels and alerts', () => {
  it('classifies ratios at the 80% and 100% thresholds', () => {
    expect(budgetLevel(0.79)).toBe('ok');
    expect(budgetLevel(0.8)).toBe('warning');
    expect(budgetLevel(1)).toBe('over');
  });

  it('alerts once per macro, month and highest threshold reached', () => {
    const budgets = computeMacroBudgets(categories, txs, ['2026-10'], limits);
    const alerts = newBudgetAlerts(budgets, [], '2026-10');
    expect(alerts.map(a => a.key)).toEqual(['2026-10:macro:Essenciais:0.8', '2026-10:macro:Estilo de Vida:1']);
    expect(newBudgetAlerts(budgets, alerts.map(a => a.key), '2026-10')).toEqual([]);
    expect(newBudgetAlerts(budgets, ['2026-10:macro:Estilo de Vida:0.8'], '2026-10').map(a => a.key))
      .toEqual(['2026-10:macro:Essenciais:0.8', '2026-10:macro:Estilo de Vida:1']);
  });
});
