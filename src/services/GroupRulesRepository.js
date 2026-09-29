import { db, expoDb } from '../database/db';
import { groupRules } from '../database/schema';
import { desc, eq } from 'drizzle-orm';
import { Logger } from '../utils/logger';

const mapRule = row => ({
  ...row,
  groupId: row.group_id ?? row.groupId,
  categoryIds: row.category_ids ?? row.categoryIds,
  accountId: row.account_id ?? row.accountId,
  minAmount: row.min_amount ?? row.minAmount,
  maxAmount: row.max_amount ?? row.maxAmount,
  dateFrom: row.date_from ?? row.dateFrom,
  dateTo: row.date_to ?? row.dateTo,
  isActive: row.is_active ?? row.isActive,
  createdAt: row.created_at ?? row.createdAt
});

export const GroupRulesRepository = {
  getAll: async () => {
    try {
      const rows = await db.select().from(groupRules).orderBy(desc(groupRules.createdAt));
      return rows.map(mapRule);
    } catch (err) {
      Logger.error('GroupRulesRepository.getAll', err);
      return [];
    }
  },

  getForGroup: async (groupId) => {
    try {
      const rows = await db.select().from(groupRules).where(eq(groupRules.groupId, groupId)).orderBy(desc(groupRules.createdAt));
      return rows.map(mapRule);
    } catch (err) {
      Logger.error('GroupRulesRepository.getForGroup', err);
      return [];
    }
  },

  add: async data => {
    try {
      const result = await db.insert(groupRules).values({
        ...data,
        createdAt: data.createdAt || Date.now()
      }).returning({ id: groupRules.id });
      return result[0]?.id;
    } catch (err) {
      Logger.error('GroupRulesRepository.add', err);
      throw err;
    }
  },

  update: async (id, data) => {
    try {
      await db.update(groupRules).set(data).where(eq(groupRules.id, id));
      return true;
    } catch (err) {
      Logger.error('GroupRulesRepository.update', err);
      throw err;
    }
  },

  remove: async id => {
    try {
      await db.delete(groupRules).where(eq(groupRules.id, id));
      return true;
    } catch (err) {
      Logger.error('GroupRulesRepository.remove', err);
      throw err;
    }
  }
};
