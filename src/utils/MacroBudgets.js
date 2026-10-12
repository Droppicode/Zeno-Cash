import { InvoiceUtils } from './InvoiceUtils';

export const BUDGET_THRESHOLDS = [0.8, 1];
export const OTHER_MACRO = 'Outros';

export const monthKeyOf = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const macroOf = category => (category && category.macro) || OTHER_MACRO;

export const listMacros = (macroOptions = [], categories = []) => {
  const names = [...macroOptions.filter(name => name && name !== OTHER_MACRO)];
  categories.forEach(cat => {
    const macro = macroOf(cat);
    if (macro !== OTHER_MACRO && !names.includes(macro)) names.push(macro);
  });
  return [...names, OTHER_MACRO];
};

const countsAsSpending = tx => tx.isPending !== 1 && tx.isIgnored !== 1 && tx.categoryId != null;

export const computeMacroBudgets = (categories, transactions, monthKeys, macroBudgets = {}, macroOptions = []) => {
  const months = new Set(monthKeys);
  const macroByCategory = new Map(categories.map(cat => [cat.id, macroOf(cat)]));
  const spentByMacro = new Map();
  transactions.forEach(tx => {
    if (!countsAsSpending(tx) || !months.has(monthKeyOf(tx.date))) return;
    const macro = macroByCategory.get(tx.categoryId);
    if (!macro) return;
    let delta = 0;
    if (tx.type === 'expense') delta = tx.amount;
    else if (InvoiceUtils.getSettlementDebtId(tx.note) !== null) delta = -tx.amount;
    if (delta) spentByMacro.set(macro, (spentByMacro.get(macro) || 0) + delta);
  });

  const monthCount = Math.max(months.size, 1);
  return listMacros(macroOptions, categories)
    .filter(macro => Number(macroBudgets[macro]) > 0)
    .map(macro => {
      const limit = Number(macroBudgets[macro]) * monthCount;
      const spent = Math.max(spentByMacro.get(macro) || 0, 0);
      return { macro, limit, spent, ratio: spent / limit };
    });
};

export const budgetLevel = (ratio) => {
  if (ratio >= 1) return 'over';
  if (ratio >= BUDGET_THRESHOLDS[0]) return 'warning';
  return 'ok';
};

export const newBudgetAlerts = (budgets, sentKeys, monthKey) => budgets.flatMap(({ macro, ratio, spent, limit }) => {
  const reached = BUDGET_THRESHOLDS.filter(t => ratio >= t);
  if (reached.length === 0) return [];
  const threshold = reached[reached.length - 1];
  const key = `${monthKey}:macro:${macro}:${threshold}`;
  return sentKeys.includes(key) ? [] : [{ key, macro, threshold, spent, limit }];
});

const MACRO_COLORS = ['#2196F3', '#9C27B0', '#4CAF50', '#FF9800', '#E91E63', '#00BCD4', '#FFC107', '#8BC34A', '#795548', '#F44336'];

export const macroColor = (macros, macro, fallback) => (
  macro === OTHER_MACRO ? fallback : MACRO_COLORS[Math.max(macros.indexOf(macro), 0) % MACRO_COLORS.length]
);
