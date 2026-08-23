import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').default('checking'), // checking, credit, cash
  balance: real('balance').default(0), // Initial balance, calculated on the fly usually
  icon: text('icon'),
  color: text('color'),
  associatedAccountId: integer('associated_account_id'),
  closingDay: integer('closing_day'),
  dueDay: integer('due_day'),
  creditLimit: real('credit_limit'),
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
  isPending: integer('is_pending').default(0),
  isIgnored: integer('is_ignored').default(0),
  recurrenceId: integer('recurrence_id'), // ID from recurrences table
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

export const recurrences = sqliteTable('recurrences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  description: text('description').notNull(),
  categoryId: integer('category_id'),
  type: text('type').notNull(), // 'income' | 'expense'
  accountId: integer('account_id'),
  startDate: integer('start_date').notNull(), // unix timestamp
  frequencyType: text('frequency_type').notNull(), // 'custom_days', 'monthly', 'yearly'
  frequencyInterval: integer('frequency_interval').notNull(), // e.g. 1 (every 1 month), 15 (every 15 days)
  installments: integer('installments'), // null if infinite, or number like 12
  interestRate: real('interest_rate'), // e.g. 1.5 for 1.5%
  interestType: text('interest_type'), // 'simple', 'compound'
  isActive: integer('is_active').default(1),
});

export const debts = sqliteTable('debts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  personName: text('person_name').notNull(),
  description: text('description'),
  type: text('type').notNull(), // 'owe' or 'owed'
  amount: real('amount').notNull(),
  date: integer('date').notNull(), // unix timestamp
  accountId: integer('account_id'),
  transactionId: integer('transaction_id'),
  recurrenceId: integer('recurrence_id'),
  isPaid: integer('is_paid').default(0),
  isPercentage: integer('is_percentage').default(0),
  ignoresInterest: integer('ignores_interest').default(0),
});

export const monthlyBalances = sqliteTable('monthly_balances', {
  monthKey: text('month_key').primaryKey(), // format 'YYYY-MM'
  income: real('income').default(0),
  expense: real('expense').default(0),
  total: real('total').default(0),
});

