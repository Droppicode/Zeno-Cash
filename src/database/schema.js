import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').default('checking'), // checking, credit, cash
  balance: real('balance').default(0), // Initial balance, calculated on the fly usually
  icon: text('icon'),
  color: text('color'),
});

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  description: text('description').notNull(),
  categoryId: integer('category_id'),
  type: text('type').notNull(), // 'income' | 'expense'
  date: integer('date').notNull(), // unix timestamp
  accountId: integer('account_id'),
  note: text('note'),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  macro: text('macro'),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
