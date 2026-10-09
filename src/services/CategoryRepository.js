import { db, expoDb } from '../database/db';
import { categories } from '../database/schema';
import { asc, eq, sql } from 'drizzle-orm';
import { Logger } from '../utils/logger';

export const CategoryRepository = {
  getAll: async () => {
    try {
      return await db.select().from(categories).orderBy(
        asc(sql`COALESCE(${categories.sortOrder}, ${categories.id})`),
        asc(categories.id)
      );
    } catch (err) {
      Logger.error('CategoryRepository.getAll', err);
      return [];
    }
  },

  add: async (catData) => {
    try {
      const values = { ...catData };
      if (values.sortOrder == null) {
        values.sortOrder = sql`(SELECT COALESCE(MAX(COALESCE(sort_order, id)), 0) + 1 FROM categories)`;
      }
      const result = await db.insert(categories).values(values).returning();
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
  },

  reorder: async (ids) => {
    try {
      const updateOrder = async () => {
        for (const [index, id] of ids.entries()) {
          await expoDb.runAsync('UPDATE categories SET sort_order = ? WHERE id = ?', [index + 1, id]);
        }
      };
      if (typeof expoDb.withTransactionAsync === 'function') {
        await expoDb.withTransactionAsync(updateOrder);
      } else {
        await updateOrder();
      }
      return true;
    } catch (err) {
      Logger.error('CategoryRepository.reorder', err);
      throw err;
    }
  }
};
