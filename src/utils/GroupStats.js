const DAY = 24 * 60 * 60 * 1000;

const monthIndex = (timestamp) => {
  const date = new Date(timestamp);
  return date.getFullYear() * 12 + date.getMonth();
};

export function calculateGroupStats(transactions = [], group = {}, now = Date.now()) {
  const validTransactions = transactions.filter(tx => tx?.date != null && tx.isIgnored !== 1 && tx.isPending !== 1);
  const nowDate = new Date(now);
  const currentMonthTotal = validTransactions
    .filter(tx => {
      const date = new Date(tx.date);
      return date.getFullYear() === nowDate.getFullYear() && date.getMonth() === nowDate.getMonth();
    })
    .reduce((sum, tx) => sum + (tx.type === 'income' ? -Math.abs(tx.amount || 0) : Math.abs(tx.amount || 0)), 0);
  const sorted = [...validTransactions].sort((a, b) => a.date - b.date);
  const total = validTransactions.reduce((sum, tx) => sum + (tx.type === 'income' ? -Math.abs(tx.amount || 0) : Math.abs(tx.amount || 0)), 0);
  const firstDate = sorted[0]?.date || null;
  const lastDate = sorted[sorted.length - 1]?.date || null;
  const start = group.startDate || firstDate || now;
  const end = group.endDate || now;
  const monthsSpan = Math.max(1, monthIndex(end) - monthIndex(start) + 1);
  const monthlyAverage = total / monthsSpan;
  const result = {
    total,
    count: validTransactions.length,
    firstDate,
    lastDate,
    monthsSpan,
    monthlyAverage,
    yearlyAverage: monthlyAverage * 12,
    currentMonthTotal
  };

  if (group.kind === 'event') {
    const daysSpan = Math.max(1, Math.ceil((end - start) / DAY) + 1);
    result.daysSpan = daysSpan;
    result.dailyAverage = total / daysSpan;
    result.budgetUsedPct = group.budget > 0 ? (total / group.budget) * 100 : null;
    result.daysRemaining = group.endDate && group.endDate > now ? Math.ceil((group.endDate - now) / DAY) : null;
  }
  return result;
}

export const getGroupStats = calculateGroupStats;
