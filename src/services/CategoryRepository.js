import { db } from '../database/db';
import { categories } from '../database/schema';
import { eq } from 'drizzle-orm';
import { Logger } from '../utils/logger';

export const CategoryRepository = {
  getAll: async () => {
    try {
      return await db.select().from(categories);
    } catch (err) {
      Logger.error('CategoryRepository.getAll', err);
      return [];
    }
  },

  add: async (catData) => {
    try {
      const result = await db.insert(categories).values(catData).returning();
      return result[0].id;
    } catch (err) {
      Logger.error('CategoryRepository.add', err);
      throw err;
    }
  },

  update: async (id, catData) => {
    try {
      await db.update(categories).set(catData).where(eq(categories.id, id));
      return true;
    } catch (err) {
      Logger.error('CategoryRepository.update', err);
      throw err;
    }
  },

  remove: async (id) => {
    try {
      await db.delete(categories).where(eq(categories.id, id));
      return true;
    } catch (err) {
      Logger.error('CategoryRepository.remove', err);
      throw err;
    }
  }
};
