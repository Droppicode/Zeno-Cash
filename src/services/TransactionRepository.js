import { db } from '../database/db';
import { transactions } from '../database/schema';
import { desc, eq } from 'drizzle-orm';
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

  add: async (txData) => {
    try {
      await db.insert(transactions).values(txData);
      return true;
    } catch (err) {
      Logger.error('TransactionRepository.add', err);
      throw err;
    }
  },

  remove: async (id) => {
    try {
      await db.delete(transactions).where(eq(transactions.id, id));
      return true;
    } catch (err) {
      Logger.error('TransactionRepository.remove', err);
      throw err;
    }
  }
};
