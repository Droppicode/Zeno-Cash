import { InvoiceUtils } from './InvoiceUtils';

export const BUDGET_THRESHOLDS = [0.8, 1];

export const monthKeyOf = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const countsAsSpending = tx => tx.isPending !== 1 && tx.isIgnored !== 1 && tx.categoryId != null;

export const computeCategoryBudgets = (categories, transactions, monthKeys) => {
  const months = new Set(monthKeys);
  const spentByCategory = new Map();
  transactions.forEach(tx => {
    if (!countsAsSpending(tx) || !months.has(monthKeyOf(tx.date))) return;
    let delta = 0;
    if (tx.type === 'expense') delta = tx.amount;
    else if (InvoiceUtils.getSettlementDebtId(tx.note) !== null) delta = -tx.amount;
    if (delta) spentByCategory.set(tx.categoryId, (spentByCategory.get(tx.categoryId) || 0) + delta);
  });

  const monthCount = Math.max(months.size, 1);
  return categories
    .filter(cat => Number(cat.monthlyBudget) > 0)
    .map(cat => {
      const limit = Number(cat.monthlyBudget) * monthCount;
      const spent = Math.max(spentByCategory.get(cat.id) || 0, 0);
      return { category: cat, limit, spent, ratio: spent / limit };
    });
};

export const budgetLevel = (ratio) => {
  if (ratio >= 1) return 'over';
  if (ratio >= BUDGET_THRESHOLDS[0]) return 'warning';
  return 'ok';
};

export const newBudgetAlerts = (budgets, sentKeys, monthKey) => budgets.flatMap(({ category, ratio, spent, limit }) => {
  const reached = BUDGET_THRESHOLDS.filter(t => ratio >= t);
  if (reached.length === 0) return [];
  const threshold = reached[reached.length - 1];
  const key = `${monthKey}:${category.id}:${threshold}`;
  return sentKeys.includes(key) ? [] : [{ key, category, threshold, spent, limit }];
});
