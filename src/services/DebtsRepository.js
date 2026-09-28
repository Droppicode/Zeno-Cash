import { db } from '../database/db';
import { debts, transactions } from '../database/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { TransactionRepository } from './TransactionRepository';

const settlementNote = (debtId) => `[debt:${debtId}]`;

const isRecurrenceTemplate = (debt) => debt.transactionId === null && debt.recurrenceId !== null;

const getSettlements = (debtId) =>
  db.select().from(transactions).where(eq(transactions.note, settlementNote(debtId)));

const removeSettlement = async (debtId) => {
  const existing = await getSettlements(debtId);
  for (const tx of existing) {
    await TransactionRepository.remove(tx.id);
  }
};

// A paid debt is reflected in the account balance through a linked "Acerto" transaction.
const syncSettlement = async (debtId) => {
  const [debt] = await db.select().from(debts).where(eq(debts.id, debtId));
  if (!debt || debt.isPaid !== 1 || isRecurrenceTemplate(debt) || debt.accountId == null) {
    await removeSettlement(debtId);
    return;
  }

  const txData = {
    amount: debt.amount,
    type: debt.type === 'owe' ? 'expense' : 'income',
    accountId: debt.accountId,
    description: `Acerto: ${debt.personName}${debt.description ? ' - ' + debt.description : ''}`,
    ...(debt.transactionId != null ? { date: debt.date } : {}),
  };

  const [existing, ...duplicates] = await getSettlements(debtId);
  for (const tx of duplicates) {
    await TransactionRepository.remove(tx.id);
  }
  if (existing) {
    await TransactionRepository.update(existing.id, txData);
  } else {
    await TransactionRepository.add({ date: Date.now(), ...txData, note: settlementNote(debtId) });
  }
};

export const DebtsRepository = {
  getAll: async () => {
    try {
      const data = await db.select().from(debts).orderBy(desc(debts.date));
      return data || [];
    } catch (e) {
      console.error('Error fetching debts:', e);
      return [];
    }
  },

  add: async (debtData) => {
    try {
      const res = await db.insert(debts).values(debtData).returning();
      const id = res[0]?.id;
      if (id) await syncSettlement(id);
      return id;
    } catch (e) {
      console.error('Error adding debt:', e);
      return null;
    }
  },

  update: async (id, debtData) => {
    try {
      await db.update(debts).set(debtData).where(eq(debts.id, id));
      await syncSettlement(id);
      return true;
    } catch (e) {
      console.error('Error updating debt:', e);
      return false;
    }
  },

  remove: async (id) => {
    try {
      await db.delete(debts).where(eq(debts.id, id));
      await removeSettlement(id);
      return true;
    } catch (e) {
      console.error('Error removing debt:', e);
      return false;
    }
  },

  getByTransactionId: async (txId) => {
    try {
      const data = await db.select().from(debts).where(eq(debts.transactionId, txId));
      return data || [];
    } catch (e) {
      console.error('Error fetching debts by txId:', e);
      return [];
    }
  },

  removeByTransactionId: async (txId) => {
    try {
      const linked = await db.select({ id: debts.id }).from(debts).where(eq(debts.transactionId, txId));
      await db.delete(debts).where(eq(debts.transactionId, txId));
      for (const d of linked) {
        await removeSettlement(d.id);
      }
      return true;
    } catch (e) {
      console.error('Error removing debts by txId:', e);
      return false;
    }
  },

  getByRecurrenceId: async (recId) => {
    try {
      const data = await db.select().from(debts).where(sql`${debts.recurrenceId} = ${recId} AND ${debts.transactionId} IS NULL`);
      return data || [];
    } catch (e) {
      console.error('Error fetching debts by recId:', e);
      return [];
    }
  },

  removeByRecurrenceId: async (recId) => {
    try {
      await db.delete(debts).where(sql`${debts.recurrenceId} = ${recId} AND ${debts.transactionId} IS NULL`);
      return true;
    } catch (e) {
      console.error('Error removing debts by recId:', e);
      return false;
    }
  },

  unmarkPaidBySettlementTx: async (txId) => {
    try {
      const [tx] = await db.select({ note: transactions.note }).from(transactions).where(eq(transactions.id, txId));
      const match = tx?.note?.match(/^\[debt:(\d+)\]$/);
      if (match) {
        await db.update(debts).set({ isPaid: 0 }).where(eq(debts.id, Number(match[1])));
      }
      return true;
    } catch (e) {
      console.error('Error unmarking debt by settlement tx:', e);
      return false;
    }
  },

  getUniqueNames: async () => {
    try {
      // Drizzle doesn't have a direct distinct() for SQLite in all versions yet, so we use raw SQL or group by
      const data = await db.select({ name: debts.personName })
        .from(debts)
        .groupBy(debts.personName);
      return data.map(item => item.name);
    } catch (e) {
      console.error('Error fetching unique names:', e);
      return [];
    }
  }
};
