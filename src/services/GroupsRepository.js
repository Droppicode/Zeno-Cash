import { db, expoDb } from '../database/db';
import { groups } from '../database/schema';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { Logger } from '../utils/logger';

const mapGroup = (row) => ({
  ...row,
  startDate: row.start_date ?? row.startDate,
  endDate: row.end_date ?? row.endDate,
  isArchived: row.is_archived ?? row.isArchived,
  createdAt: row.created_at ?? row.createdAt
});

const mapTransaction = (row) => ({
  ...row,
  categoryId: row.category_id,
  accountId: row.account_id,
  isPending: row.is_pending,
  isIgnored: row.is_ignored,
  recurrenceId: row.recurrence_id
});

export const GroupsRepository = {
  getAll: async ({ includeArchived = false } = {}) => {
    try {
      const orderGroups = [
        asc(sql`${groups.sortOrder} IS NULL`),
        asc(groups.sortOrder),
        desc(groups.createdAt)
      ];
      const query = includeArchived
        ? db.select().from(groups).orderBy(...orderGroups)
        : db.select().from(groups).where(eq(groups.isArchived, 0)).orderBy(...orderGroups);
      return (await query).map(mapGroup);
    } catch (err) {
      Logger.error('GroupsRepository.getAll', err);
      return [];
    }
  },

  getById: async (id) => {
    try {
      const result = await db.select().from(groups).where(eq(groups.id, id));
      return result[0] ? mapGroup(result[0]) : null;
    } catch (err) {
      Logger.error('GroupsRepository.getById', err);
      return null;
    }
  },

  add: async (data) => {
    try {
      const values = {
        ...data,
        createdAt: data.createdAt || Date.now()
      };
      if (values.sortOrder == null) {
        values.sortOrder = sql`(SELECT COALESCE(MAX(sort_order), 0) + 1 FROM groups)`;
      }
      const result = await db.insert(groups).values(values).returning({ id: groups.id });
      return result[0]?.id;
    } catch (err) {
      Logger.error('GroupsRepository.add', err);
      throw err;
    }
  },

  reorder: async (ids) => {
    try {
      const updateOrder = async () => {
        for (const [index, id] of ids.entries()) {
          await expoDb.runAsync('UPDATE groups SET sort_order = ? WHERE id = ?', [index + 1, id]);
        }
      };
      if (typeof expoDb.withTransactionAsync === 'function') {
        await expoDb.withTransactionAsync(updateOrder);
      } else {
        await updateOrder();
      }
      return true;
    } catch (err) {
      Logger.error('GroupsRepository.reorder', err);
      throw err;
    }
  },

  update: async (id, data) => {
    try {
      await db.update(groups).set(data).where(eq(groups.id, id));
      return true;
    } catch (err) {
      Logger.error('GroupsRepository.update', err);
      throw err;
    }
  },

  remove: async (id) => {
    try {
      await expoDb.runAsync('DELETE FROM transaction_groups WHERE group_id = ?', [id]);
      await expoDb.runAsync('DELETE FROM recurrence_groups WHERE group_id = ?', [id]);
      await expoDb.runAsync('DELETE FROM group_rules WHERE group_id = ?', [id]);
      await db.delete(groups).where(eq(groups.id, id));
      return true;
    } catch (err) {
      Logger.error('GroupsRepository.remove', err);
      throw err;
    }
  },

  getTransactionGroupMap: async () => {
    try {
      const rows = await expoDb.getAllAsync('SELECT transaction_id, group_id FROM transaction_groups');
      return rows.reduce((map, row) => {
        if (!map[row.transaction_id]) map[row.transaction_id] = [];
        map[row.transaction_id].push(row.group_id);
        return map;
      }, {});
    } catch (err) {
      Logger.error('GroupsRepository.getTransactionGroupMap', err);
      return {};
    }
  },

  getGroupIdsForTransaction: async (txId) => {
    try {
      const rows = await expoDb.getAllAsync('SELECT group_id FROM transaction_groups WHERE transaction_id = ?', [txId]);
      return rows.map(row => row.group_id);
    } catch (err) {
      Logger.error('GroupsRepository.getGroupIdsForTransaction', err);
      return [];
    }
  },

  setTransactionGroups: async (txId, groupIds = []) => {
    try {
      await expoDb.runAsync('DELETE FROM transaction_groups WHERE transaction_id = ?', [txId]);
      for (const groupId of groupIds) {
        await expoDb.runAsync(
          'INSERT OR IGNORE INTO transaction_groups (transaction_id, group_id) VALUES (?, ?)',
          [txId, groupId]
        );
      }
      return true;
    } catch (err) {
      Logger.error('GroupsRepository.setTransactionGroups', err);
      throw err;
    }
  },

  setRecurrenceGroups: async (recId, groupIds = []) => {
    try {
      await expoDb.runAsync('DELETE FROM recurrence_groups WHERE recurrence_id = ?', [recId]);
      for (const groupId of groupIds) {
        await expoDb.runAsync(
          'INSERT OR IGNORE INTO recurrence_groups (recurrence_id, group_id) VALUES (?, ?)',
          [recId, groupId]
        );
      }
      return true;
    } catch (err) {
      Logger.error('GroupsRepository.setRecurrenceGroups', err);
      throw err;
    }
  },

  getGroupIdsForRecurrence: async (recId) => {
    try {
      const rows = await expoDb.getAllAsync('SELECT group_id FROM recurrence_groups WHERE recurrence_id = ?', [recId]);
      return rows.map(row => row.group_id);
    } catch (err) {
      Logger.error('GroupsRepository.getGroupIdsForRecurrence', err);
      return [];
    }
  },

  getTransactionsForGroup: async (groupId) => {
    try {
      const rows = await expoDb.getAllAsync(`
        SELECT t.*
        FROM transactions t
        INNER JOIN transaction_groups tg ON tg.transaction_id = t.id
        WHERE tg.group_id = ?
        ORDER BY t.date DESC
      `, [groupId]);
      return rows.map(mapTransaction);
    } catch (err) {
      Logger.error('GroupsRepository.getTransactionsForGroup', err);
      return [];
    }
  }
};
