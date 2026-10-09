import { db, expoDb } from '../database/db';
import { transactions, monthlyBalances } from '../database/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { Logger } from '../utils/logger';

export const MONTHLY_BALANCES_VERSION = 2;

export const TransactionRepository = {
  getAll: async () => {
    try {
      return await db.select().from(transactions).orderBy(desc(transactions.date));
    } catch (err) {
      Logger.error('TransactionRepository.getAll', err);
      return [];
    }
  },

  recalculateMonth: async (dateMs, database = expoDb) => {
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
      
      const result = await database.getAllAsync(query, [startOfMonth, endOfMonth]);
      const income = result[0]?.income || 0;
      const expense = result[0]?.expense || 0;
      const total = income - expense;

      await database.runAsync(`
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

  rebuildAllMonthlyBalances: async (database = expoDb) => {
    const txs = await database.getAllAsync('SELECT date FROM transactions');
    const months = new Set();
    txs.forEach(tx => {
      const date = new Date(tx.date);
      if (Number.isNaN(date.getTime())) return;
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });

    await database.runAsync('DELETE FROM monthly_balances');

    for (const monthKey of months) {
      const [year, month] = monthKey.split('-');
      const monthStart = new Date(Number(year), Number(month) - 1, 1).getTime();
      await TransactionRepository.recalculateMonth(monthStart, database);
    }

    await database.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      ['monthly_balances_version', String(MONTHLY_BALANCES_VERSION)]
    );
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
      const versionRes = await expoDb.getAllAsync(
        'SELECT value FROM settings WHERE key = ?',
        ['monthly_balances_version']
      );
      const storedVersion = Number.parseInt(versionRes[0]?.value || '0', 10) || 0;
      const countRes = await expoDb.getAllAsync(`SELECT COUNT(*) as c FROM monthly_balances`);
      if (storedVersion < MONTHLY_BALANCES_VERSION || countRes[0]?.c === 0) {
        await TransactionRepository.rebuildAllMonthlyBalances();
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
      await expoDb.runAsync('DELETE FROM transaction_groups WHERE transaction_id = ?', [id]);
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
