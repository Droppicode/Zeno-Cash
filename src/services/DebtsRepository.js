import { db } from '../database/db';
import { debts } from '../database/schema';
import { desc, eq, sql } from 'drizzle-orm';

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
      return res[0]?.id;
    } catch (e) {
      console.error('Error adding debt:', e);
      return null;
    }
  },

  update: async (id, debtData) => {
    try {
      await db.update(debts).set(debtData).where(eq(debts.id, id));
      return true;
    } catch (e) {
      console.error('Error updating debt:', e);
      return false;
    }
  },

  remove: async (id) => {
    try {
      await db.delete(debts).where(eq(debts.id, id));
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
      await db.delete(debts).where(eq(debts.transactionId, txId));
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
