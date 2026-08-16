import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  description: text('description').notNull(),
  categoryId: integer('category_id'),
  type: text('type').notNull(), // 'income' | 'expense'
  date: integer('date').notNull(), // unix timestamp
  accountId: integer('account_id'),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
});
