import { InvoiceUtils } from './InvoiceUtils';
import { CurrencyUtils } from './currencyUtils';
import { RecurrenceGenerator } from '../services/RecurrenceGenerator';

export const DEFAULT_REMINDER_CONFIG = {
  enabled: true,
  invoices: true,
  invoiceDaysBefore: 3,
  recurrences: true,
  debts: true,
  staleDebtDays: 30,
  hour: 9
};

const HORIZON_DAYS = 35;
const MAX_REMINDERS = 60;

const money = value => `R$ ${CurrencyUtils.formatDisplay(value)}`;

const atHour = (timestamp, hour) => {
  const d = new Date(timestamp);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
};

const addDays = (timestamp, days) => {
  const d = new Date(timestamp);
  d.setDate(d.getDate() + days);
  return d.getTime();
};

const dayKey = (timestamp) => {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isSettled = tx => tx.isPending !== 1 && tx.isIgnored !== 1;

const invoiceReminders = (accounts, transactions, config, inWindow) => accounts
  .filter(acc => acc.type === 'credit' && acc.closingDay && acc.dueDay)
  .flatMap(card => {
    const cardTxs = transactions.filter(tx => tx.accountId === card.id && isSettled(tx));
    return InvoiceUtils.groupTransactionsByInvoice(cardTxs, card.closingDay, card.dueDay)
      .filter(inv => inv.total > 0.005)
      .flatMap(inv => {
        const dueDate = InvoiceUtils.getInvoiceDueDate(inv.monthKey, card.dueDay);
        if (!dueDate) return [];
        const offsets = [...new Set([config.invoiceDaysBefore, 0])];
        return offsets.map(daysBefore => ({
          id: `invoice:${card.id}:${inv.monthKey}:${daysBefore}`,
          date: atHour(addDays(dueDate, -daysBefore), config.hour),
          title: daysBefore === 0
            ? `Fatura ${card.name} vence hoje`
            : `Fatura ${card.name} vence em ${daysBefore} ${daysBefore === 1 ? 'dia' : 'dias'}`,
          body: `Valor atual: ${money(inv.total)}.`
        })).filter(r => inWindow(r.date));
      });
  });

const recurrenceReminders = (recurrences, transactions, config, now, inWindow) => {
  const active = recurrences.filter(rec => rec.isActive);
  if (active.length === 0) return [];
  const upcoming = RecurrenceGenerator.generateVirtualTransactions(active, transactions, addDays(now, HORIZON_DAYS));
  const byDay = new Map();
  upcoming.forEach(tx => {
    const key = dayKey(tx.date);
    byDay.set(key, [...(byDay.get(key) || []), tx]);
  });
  return [...byDay.entries()].map(([key, txs]) => ({
    id: `recurrence:${key}`,
    date: atHour(txs[0].date, config.hour),
    title: txs.length === 1 ? `Hoje: ${txs[0].description}` : `Hoje: ${txs.length} recorrências`,
    body: txs.map(tx => `${tx.description} ${money(tx.amount)}`).join(' · ')
  })).filter(r => inWindow(r.date));
};

const debtLine = debt => (debt.type === 'owed'
  ? `${debt.personName} te deve ${money(debt.amount)}`
  : `Você deve ${money(debt.amount)} a ${debt.personName}`);

const nextMonday = (now, hour) => {
  let candidate = atHour(now, hour);
  while (new Date(candidate).getDay() !== 1 || candidate <= now) candidate = atHour(addDays(candidate, 1), hour);
  return candidate;
};

const debtReminders = (debts, config, now, inWindow) => {
  const open = debts.filter(debt => debt.isPaid !== 1 && debt.amount > 0);
  const staleAt = debt => atHour(addDays(debt.date, config.staleDebtDays), config.hour);

  const becomingStale = open
    .filter(debt => staleAt(debt) > now)
    .map(debt => ({
      id: `debt:${debt.id}`,
      date: staleAt(debt),
      title: `Dívida parada há ${config.staleDebtDays} dias`,
      body: `${debtLine(debt)}${debt.description ? ` (${debt.description})` : ''}.`
    }))
    .filter(r => inWindow(r.date));

  const alreadyStale = open.filter(debt => staleAt(debt) <= now);
  if (alreadyStale.length === 0) return becomingStale;

  const owedToYou = alreadyStale.filter(d => d.type === 'owed').reduce((sum, d) => sum + d.amount, 0);
  const youOwe = alreadyStale.filter(d => d.type !== 'owed').reduce((sum, d) => sum + d.amount, 0);
  const parts = [owedToYou > 0 && `te devem ${money(owedToYou)}`, youOwe > 0 && `você deve ${money(youOwe)}`].filter(Boolean);
  return [...becomingStale, {
    id: 'debt:weekly',
    date: nextMonday(now, config.hour),
    title: alreadyStale.length === 1
      ? `1 dívida parada há mais de ${config.staleDebtDays} dias`
      : `${alreadyStale.length} dívidas paradas há mais de ${config.staleDebtDays} dias`,
    body: alreadyStale.length === 1 ? `${debtLine(alreadyStale[0])}.` : `No total, ${parts.join(' e ')}.`
  }];
};

export const buildReminders = ({ accounts = [], transactions = [], recurrences = [], debts = [], config: rawConfig, now = Date.now() }) => {
  const config = { ...DEFAULT_REMINDER_CONFIG, ...rawConfig };
  if (!config.enabled) return [];
  const horizonEnd = addDays(now, HORIZON_DAYS);
  const inWindow = date => date > now && date <= horizonEnd;

  return [
    ...(config.invoices ? invoiceReminders(accounts, transactions, config, inWindow) : []),
    ...(config.recurrences ? recurrenceReminders(recurrences, transactions, config, now, inWindow) : []),
    ...(config.debts ? debtReminders(debts, config, now, inWindow) : [])
  ]
    .sort((a, b) => a.date - b.date)
    .slice(0, MAX_REMINDERS);
};

