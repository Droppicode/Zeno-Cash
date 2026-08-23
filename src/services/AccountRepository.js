import { db, expoDb } from '../database/db';
import { accounts } from '../database/schema';
import { eq } from 'drizzle-orm';
import { Logger } from '../utils/logger';

export const AccountRepository = {
  getAll: async () => {
    try {
      const rows = await expoDb.getAllAsync(`
        SELECT 
          a.id, a.name, a.type, a.balance, a.icon, a.color,
          a.associated_account_id as associatedAccountId, a.closing_day as closingDay, a.due_day as dueDay, a.credit_limit as creditLimit,
          a.balance + COALESCE(SUM(CASE WHEN t.type = 'income' THEN ABS(t.amount) ELSE -ABS(t.amount) END), 0) as currentBalance
        FROM accounts a
        LEFT JOIN transactions t ON a.id = t.account_id AND (t.is_pending = 0 OR t.is_pending IS NULL) AND t.date <= ${Date.now()}
        GROUP BY a.id
      `);
      return rows;
    } catch (err) {
      Logger.error('AccountRepository.getAll', err);
      return [];
    }
  },

  add: async (accData) => {
    try {
      const result = await db.insert(accounts).values(accData).returning();
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
  }
};
