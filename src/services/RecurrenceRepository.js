import { db, expoDb } from '../database/db';
import { recurrences } from '../database/schema';
import { eq } from 'drizzle-orm';
import { Logger } from '../utils/logger';

export const RecurrenceRepository = {
  getAll: async () => {
    try {
      return await db.select().from(recurrences);
    } catch (err) {
      Logger.error('RecurrenceRepository.getAll', err);
      return [];
    }
  },

  getActive: async () => {
    try {
      return await db.select().from(recurrences).where(eq(recurrences.isActive, 1));
    } catch (err) {
      Logger.error('RecurrenceRepository.getActive', err);
      return [];
    }
  },

  add: async (data) => {
    try {
      const result = await db.insert(recurrences).values(data).returning({ id: recurrences.id });
      return result[0]?.id;
    } catch (err) {
      Logger.error('RecurrenceRepository.add', err);
      throw err;
    }
  },

  update: async (id, data) => {
    try {
      await db.update(recurrences).set(data).where(eq(recurrences.id, id));
      return true;
    } catch (err) {
      Logger.error('RecurrenceRepository.update', err);
      throw err;
    }
  },

  remove: async (id) => {
    try {
      await db.delete(recurrences).where(eq(recurrences.id, id));
      return true;
    } catch (err) {
      Logger.error('RecurrenceRepository.remove', err);
      throw err;
    }
  }
};
