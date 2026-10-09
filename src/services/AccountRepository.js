import { db, expoDb } from '../database/db';
import { accounts } from '../database/schema';
import { eq, sql } from 'drizzle-orm';
import { Logger } from '../utils/logger';

export const AccountRepository = {
  getAll: async () => {
    try {
      const rows = await expoDb.getAllAsync(`
        SELECT 
          a.id, a.name, a.type, a.balance, a.icon, a.color,
          a.associated_account_id as associatedAccountId, a.closing_day as closingDay, a.due_day as dueDay, a.credit_limit as creditLimit,
          a.sort_order as sortOrder,
          a.balance + COALESCE(SUM(CASE WHEN t.type = 'income' THEN ABS(t.amount) ELSE -ABS(t.amount) END), 0) as currentBalance
        FROM accounts a
        LEFT JOIN transactions t ON a.id = t.account_id AND (t.is_pending = 0 OR t.is_pending IS NULL) AND t.date <= ${Date.now()}
        GROUP BY a.id
        ORDER BY COALESCE(a.sort_order, a.id), a.id
      `);
      return rows;
    } catch (err) {
      Logger.error('AccountRepository.getAll', err);
      return [];
    }
  },

  add: async (accData) => {
    try {
      const values = { ...accData };
      if (values.sortOrder == null) {
        values.sortOrder = sql`(SELECT COALESCE(MAX(COALESCE(sort_order, id)), 0) + 1 FROM accounts)`;
      }
      const result = await db.insert(accounts).values(values).returning();
      return result[0]?.id;
    } catch (err) {
      Logger.error('AccountRepository.add', err);
      throw err;
    }
  },

  update: async (id, accData) => {
    try {
      await db.update(accounts).set(accData).where(eq(accounts.id, id));
      return true;
    } catch (err) {
      Logger.error('AccountRepository.update', err);
      throw err;
    }
  },

  remove: async (id) => {
    try {
      await db.delete(accounts).where(eq(accounts.id, id));
      return true;
    } catch (err) {
      Logger.error('AccountRepository.remove', err);
      throw err;
    }
  },

  reorder: async (ids) => {
    try {
      const updateOrder = async () => {
        for (const [index, id] of ids.entries()) {
          await expoDb.runAsync('UPDATE accounts SET sort_order = ? WHERE id = ?', [index + 1, id]);
        }
      };
      if (typeof expoDb.withTransactionAsync === 'function') {
        await expoDb.withTransactionAsync(updateOrder);
      } else {
        await updateOrder();
      }
      return true;
    } catch (err) {
      Logger.error('AccountRepository.reorder', err);
      throw err;
    }
  }
};
