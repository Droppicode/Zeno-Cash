import { CurrencyUtils } from './currencyUtils';
import { InvoiceUtils } from './InvoiceUtils';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_INSIGHTS = 5;

const money = value => `R$ ${CurrencyUtils.formatDisplay(value)}`;
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const monthKey = (year, month) => {
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const keyOf = date => {
  const d = new Date(date);
  return monthKey(d.getFullYear(), d.getMonth());
};
const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

const isSpending = tx => tx.type === 'expense' && tx.isPending !== 1 && tx.isIgnored !== 1
  && InvoiceUtils.getSettlementDebtId(tx.note) === null;

const categorySpikes = (spending, categories, ctx) => {
  const { year, month, day, currentKey } = ctx;
  const previous = [1, 2, 3].map(back => {
    const key = monthKey(year, month - back);
    const [y, m] = key.split('-').map(Number);
    return { key, cutoff: Math.min(day, daysInMonth(y, m - 1)) };
  });

  return categories.map(cat => {
    const txs = spending.filter(tx => tx.categoryId === cat.id);
    const current = txs.filter(tx => keyOf(tx.date) === currentKey).reduce((sum, tx) => sum + tx.amount, 0);
    const history = previous.map(p => txs
      .filter(tx => keyOf(tx.date) === p.key && new Date(tx.date).getDate() <= p.cutoff)
      .reduce((sum, tx) => sum + tx.amount, 0));
    const withData = history.filter(v => v > 0);
    if (withData.length < 2) return null;
    const average = history.reduce((sum, v) => sum + v, 0) / history.length;
    if (current < average * 1.3 || current - average < 50) return null;
    const pct = Math.round((current / average - 1) * 100);
    return {
      id: `spike:${cat.id}:${currentKey}`,
      kind: 'spike',
      tone: 'warning',
      icon: cat.icon || 'trending-up',
      weight: current - average,
      title: `${cat.name} está ${pct}% acima da sua média`,
      body: `${money(current)} até hoje, contra ${money(average)} em média até o dia ${day} nos últimos 3 meses.`,
      action: { label: 'Ver transações', route: 'Transações' }
    };
  }).filter(Boolean).sort((a, b) => b.weight - a.weight).slice(0, 2);
};

const byDescription = (txs) => {
  const map = new Map();
  txs.forEach(tx => {
    const key = normalize(tx.description);
    if (!key) return;
    map.set(key, [...(map.get(key) || []), tx]);
  });
  return map;
};

const priceChanges = (spending, ctx) => {
  const { year, month, currentKey } = ctx;
  const prevKeys = [1, 2].map(back => monthKey(year, month - back));
  const result = [];
  byDescription(spending).forEach(txs => {
    const inMonth = key => txs.filter(tx => keyOf(tx.date) === key);
    const current = inMonth(currentKey);
    const prev = prevKeys.map(inMonth);
    if (current.length !== 1 || prev.some(list => list.length !== 1)) return;
    const oldAmount = prev[0][0].amount;
    if (Math.abs(prev[1][0].amount - oldAmount) >= 0.01) return;
    const newAmount = current[0].amount;
    if (Math.abs(newAmount - oldAmount) < Math.max(0.01, oldAmount * 0.01)) return;
    const up = newAmount > oldAmount;
    result.push({
      id: `price:${normalize(current[0].description)}:${currentKey}`,
      kind: 'price',
      tone: up ? 'warning' : 'good',
      icon: up ? 'arrow-up-circle' : 'arrow-down-circle',
      weight: Math.abs(newAmount - oldAmount),
      title: `${prev[0][0].description} ${up ? 'subiu' : 'baixou'} de ${money(oldAmount)} para ${money(newAmount)}`,
      body: 'Comparado com o valor que se repetiu nos últimos 2 meses.',
      action: { label: 'Ver transações', route: 'Transações' }
    });
  });
  return result;
};

const missingRecurring = (transactions, spending, ctx) => {
  const { year, month, day, currentKey } = ctx;
  const prevKeys = [1, 2, 3].map(back => monthKey(year, month - back));
  const thisMonth = new Set(transactions.filter(tx => keyOf(tx.date) === currentKey).map(tx => normalize(tx.description)));
  const result = [];
  byDescription(spending).forEach((txs, key) => {
    if (thisMonth.has(key)) return;
    const perMonth = prevKeys.map(k => txs.filter(tx => keyOf(tx.date) === k));
    if (perMonth.some(list => list.length !== 1)) return;
    const occurrences = perMonth.map(list => list[0]);
    const days = occurrences.map(tx => new Date(tx.date).getDate());
    const amounts = occurrences.map(tx => tx.amount);
    if (Math.max(...days) - Math.min(...days) > 5) return;
    if (Math.max(...amounts) > Math.min(...amounts) * 1.2) return;
    if (day <= Math.max(...days) + 2) return;
    const usualDay = Math.round(days.reduce((sum, d) => sum + d, 0) / days.length);
    result.push({
      id: `missing:${key}:${currentKey}`,
      kind: 'missing',
      tone: 'info',
      icon: 'calendar-outline',
      weight: amounts[0],
      title: `${occurrences[0].description} ainda não apareceu este mês`,
      body: `Costuma cair por volta do dia ${usualDay}, com ${money(amounts[0])}.`,
      action: { label: 'Ver transações', route: 'Transações' }
    });
  });
  return result.sort((a, b) => b.weight - a.weight).slice(0, 2);
};

const forecast = (spending, ctx) => {
  const { year, month, day, now, currentKey } = ctx;
  if (day < 5) return [];
  const current = spending.filter(tx => keyOf(tx.date) === currentKey && tx.date <= now).reduce((sum, tx) => sum + tx.amount, 0);
  const lastKey = monthKey(year, month - 1);
  const last = spending.filter(tx => keyOf(tx.date) === lastKey).reduce((sum, tx) => sum + tx.amount, 0);
  if (current <= 0 || last <= 0) return [];
  const projected = current / day * daysInMonth(year, month);
  const diff = projected - last;
  if (Math.abs(diff) / last < 0.15) return [];
  return [{
    id: `forecast:${currentKey}`,
    kind: 'forecast',
    tone: diff > 0 ? 'warning' : 'good',
    icon: 'analytics-outline',
    weight: Math.abs(diff),
    title: `No ritmo atual, você fecha o mês gastando ${money(projected)}`,
    body: `${money(Math.abs(diff))} ${diff > 0 ? 'a mais' : 'a menos'} que no mês passado (${money(last)}).`,
    action: { label: 'Ver análise', route: 'Análise' }
  }];
};

const staleDebts = (debts, ctx) => {
  const open = debts
    .filter(d => d.isPaid !== 1 && d.type === 'owed' && d.amount > 0 && !(d.transactionId == null && d.recurrenceId != null))
    .map(d => ({ ...d, age: Math.floor((ctx.now - d.date) / DAY_MS) }))
    .filter(d => d.age >= 30)
    .sort((a, b) => b.age - a.age);
  if (open.length === 0) return [];
  const oldest = open[0];
  return [{
    id: `debt:${oldest.id}:${ctx.currentKey}`,
    kind: 'debt',
    tone: 'info',
    icon: 'people-outline',
    weight: oldest.amount,
    title: `${oldest.personName} te deve ${money(oldest.amount)} há ${oldest.age} dias`,
    body: open.length > 1 ? `E mais ${open.length - 1} dívida(s) a receber paradas há mais de 30 dias.` : 'Que tal cobrar?',
    action: { label: 'Ver dívidas', route: 'Debts' }
  }];
};

const uncategorized = (transactions, ctx) => {
  const count = transactions.filter(tx => keyOf(tx.date) === ctx.currentKey && tx.isPending !== 1
    && tx.isIgnored !== 1 && tx.categoryId == null && InvoiceUtils.getSettlementDebtId(tx.note) === null).length;
  if (count < 3) return [];
  return [{
    id: `uncategorized:${ctx.currentKey}`,
    kind: 'uncategorized',
    tone: 'info',
    icon: 'pricetags-outline',
    weight: count,
    title: `${count} transações deste mês estão sem categoria`,
    body: 'Categorizar deixa o orçamento e a análise mais precisos.',
    action: { label: 'Ver transações', route: 'Transações' }
  }];
};

const KIND_ORDER = ['spike', 'forecast', 'missing', 'price', 'debt', 'uncategorized'];

export const buildInsights = ({ transactions = [], categories = [], debts = [], dismissed = [], now = Date.now() }) => {
  const today = new Date(now);
  const ctx = {
    now,
    year: today.getFullYear(),
    month: today.getMonth(),
    day: today.getDate(),
    currentKey: monthKey(today.getFullYear(), today.getMonth())
  };
  const spending = transactions.filter(isSpending);
  const dismissedSet = new Set(dismissed);
  return [
    ...categorySpikes(spending, categories, ctx),
    ...forecast(spending, ctx),
    ...missingRecurring(transactions, spending, ctx),
    ...priceChanges(spending, ctx).sort((a, b) => b.weight - a.weight).slice(0, 2),
    ...staleDebts(debts, ctx),
    ...uncategorized(transactions, ctx)
  ]
    .filter(insight => !dismissedSet.has(insight.id))
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
    .slice(0, MAX_INSIGHTS);
};
