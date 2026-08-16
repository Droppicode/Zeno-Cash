import { db } from '../database/db';
import { accounts } from '../database/schema';
import { eq } from 'drizzle-orm';
import { Logger } from '../utils/logger';

export const AccountRepository = {
  getAll: async () => {
    try {
      return await db.select().from(accounts);
    } catch (err) {
      Logger.error('AccountRepository.getAll', err);
      return [];
    }
  },

  add: async (accData) => {
    try {
      await db.insert(accounts).values(accData);
      return true;
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
