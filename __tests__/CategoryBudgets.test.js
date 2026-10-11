import { budgetLevel, computeCategoryBudgets, newBudgetAlerts } from '../src/utils/CategoryBudgets';

const food = { id: 1, name: 'Alimentação', monthlyBudget: 500 };
const fun = { id: 2, name: 'Lazer', monthlyBudget: 200 };
const noBudget = { id: 3, name: 'Outros', monthlyBudget: null };
const d = (y, m, day) => new Date(y, m - 1, day, 12).getTime();

const txs = [
  { id: 1, categoryId: 1, type: 'expense', amount: 300, date: d(2026, 10, 2) },
  { id: 2, categoryId: 1, type: 'expense', amount: 150, date: d(2026, 10, 9) },
  { id: 3, categoryId: 1, type: 'expense', amount: 999, date: d(2026, 10, 9), isPending: 1 },
  { id: 4, categoryId: 1, type: 'expense', amount: 999, date: d(2026, 10, 9), isIgnored: 1 },
  { id: 5, categoryId: 1, type: 'expense', amount: 400, date: d(2026, 9, 20) },
  { id: 6, categoryId: 1, type: 'income', amount: 50, date: d(2026, 10, 10), note: 'Acerto [debt:7]' },
  { id: 7, categoryId: 1, type: 'income', amount: 1000, date: d(2026, 10, 10) },
  { id: 8, categoryId: 2, type: 'expense', amount: 250, date: d(2026, 10, 5) },
  { id: 9, categoryId: 3, type: 'expense', amount: 80, date: d(2026, 10, 5) }
];

describe('computeCategoryBudgets', () => {
  it('sums approved expenses of the month, minus debt settlements, only for budgeted categories', () => {
    const result = computeCategoryBudgets([food, fun, noBudget], txs, ['2026-10']);
    expect(result.map(b => b.category.id)).toEqual([1, 2]);
    expect(result[0]).toMatchObject({ spent: 400, limit: 500, ratio: 0.8 });
    expect(result[1]).toMatchObject({ spent: 250, limit: 200, ratio: 1.25 });
  });

  it('scales the limit with the number of selected months', () => {
    const [foodBudget] = computeCategoryBudgets([food], txs, ['2026-09', '2026-10']);
    expect(foodBudget).toMatchObject({ spent: 800, limit: 1000 });
  });

  it('never reports negative spending', () => {
    const [foodBudget] = computeCategoryBudgets([food], [txs[5]], ['2026-10']);
    expect(foodBudget.spent).toBe(0);
  });
});

describe('budget levels and alerts', () => {
  it('classifies ratios at the 80% and 100% thresholds', () => {
    expect(budgetLevel(0.79)).toBe('ok');
    expect(budgetLevel(0.8)).toBe('warning');
    expect(budgetLevel(1)).toBe('over');
  });

  it('alerts once per category, month and highest threshold reached', () => {
    const budgets = computeCategoryBudgets([food, fun], txs, ['2026-10']);
    const alerts = newBudgetAlerts(budgets, [], '2026-10');
    expect(alerts.map(a => a.key)).toEqual(['2026-10:1:0.8', '2026-10:2:1']);
    expect(newBudgetAlerts(budgets, alerts.map(a => a.key), '2026-10')).toEqual([]);
    expect(newBudgetAlerts(budgets, ['2026-10:2:0.8'], '2026-10').map(a => a.key)).toEqual(['2026-10:1:0.8', '2026-10:2:1']);
  });
});
