import { db, expoDb } from '../database/db';
import { transactions, monthlyBalances } from '../database/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { Logger } from '../utils/logger';

export const TransactionRepository = {
  getAll: async () => {
    try {
      return await db.select().from(transactions).orderBy(desc(transactions.date));
    } catch (err) {
      Logger.error('TransactionRepository.getAll', err);
      return [];
    }
  },

  recalculateMonth: async (dateMs) => {
    try {
      const d = new Date(dateMs);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

      const query = `
        SELECT 
          SUM(CASE WHEN type = 'income' AND is_ignored = 0 THEN ABS(amount) ELSE 0 END) as income,
          SUM(CASE WHEN type = 'expense' AND is_ignored = 0 THEN ABS(amount) ELSE 0 END) as expense
        FROM transactions
        WHERE date >= ? AND date <= ?
      `;
      
      const result = await expoDb.getAllAsync(query, [startOfMonth, endOfMonth]);
      const income = result[0]?.income || 0;
      const expense = result[0]?.expense || 0;
      const total = income - expense;

      await expoDb.runAsync(`
        INSERT INTO monthly_balances (month_key, income, expense, total)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(month_key) DO UPDATE SET
          income = excluded.income,
          expense = excluded.expense,
          total = excluded.total
      `, [monthKey, income, expense, total]);

    } catch (err) {
      Logger.error('TransactionRepository.recalculateMonth', err);
    }
  },

  getMonthlyBalances: async (monthKeys) => {
    try {
      if (!monthKeys || monthKeys.length === 0) return [];
      return await db.select().from(monthlyBalances).where(inArray(monthlyBalances.monthKey, monthKeys));
    } catch (err) {
      Logger.error('TransactionRepository.getMonthlyBalances', err);
      return [];
    }
  },

  initMonthlyBalances: async () => {
    try {
      const countRes = await expoDb.getAllAsync(`SELECT COUNT(*) as c FROM monthly_balances`);
      if (countRes[0].c === 0) {
        const txs = await expoDb.getAllAsync(`SELECT date FROM transactions`);
        const months = new Set();
        txs.forEach(t => {
          const d = new Date(t.date);
          months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        });
        
        for (const monthKey of months) {
          const [yyyy, mm] = monthKey.split('-');
          const startMs = new Date(parseInt(yyyy), parseInt(mm) - 1, 1).getTime();
          await TransactionRepository.recalculateMonth(startMs);
        }
      }
    } catch (err) {
      Logger.error('TransactionRepository.initMonthlyBalances', err);
    }
  },

  add: async (txData) => {
    try {
      const res = await db.insert(transactions).values(txData).returning();
      if (res[0]) {
        await TransactionRepository.recalculateMonth(res[0].date);
      }
      return res[0]?.id;
    } catch (err) {
      Logger.error('TransactionRepository.add', err);
      throw err;
    }
  },

  update: async (id, txData) => {
    try {
      const oldTx = await db.select().from(transactions).where(eq(transactions.id, id));
      await db.update(transactions).set(txData).where(eq(transactions.id, id));
      
      if (oldTx.length > 0) {
        await TransactionRepository.recalculateMonth(oldTx[0].date);
        if (txData.date) {
          const oldD = new Date(oldTx[0].date);
          const newD = new Date(txData.date);
          if (oldD.getFullYear() !== newD.getFullYear() || oldD.getMonth() !== newD.getMonth()) {
            await TransactionRepository.recalculateMonth(txData.date);
          }
        }
      }
      return true;
    } catch (err) {
      Logger.error('TransactionRepository.update', err);
      throw err;
    }
  },

  remove: async (id) => {
    try {
      const oldTx = await db.select().from(transactions).where(eq(transactions.id, id));
      await db.delete(transactions).where(eq(transactions.id, id));
      if (oldTx.length > 0) {
        await TransactionRepository.recalculateMonth(oldTx[0].date);
      }
      return true;
    } catch (err) {
      Logger.error('TransactionRepository.remove', err);
      throw err;
    }
  }
};
