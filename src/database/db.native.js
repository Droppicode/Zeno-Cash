import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

// Inicializa a conexão nativa com o banco do Expo
export const expoDb = openDatabaseSync('zenocash.db');

expoDb.execSync('PRAGMA journal_mode = WAL;');
expoDb.execSync('PRAGMA foreign_keys = ON;');

// Setup das tabelas de forma síncrona (muito mais rápido e evita migrações pesadas no MVP)
expoDb.execSync(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'checking',
    balance REAL DEFAULT 0,
    icon TEXT,
    color TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    category_id INTEGER,
    type TEXT NOT NULL,
    date INTEGER NOT NULL,
    account_id INTEGER
  );
  
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS recurrences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    category_id INTEGER,
    type TEXT NOT NULL,
    account_id INTEGER,
    start_date INTEGER NOT NULL,
    frequency_type TEXT NOT NULL,
    frequency_interval INTEGER NOT NULL,
    installments INTEGER,
    interest_rate REAL,
    interest_type TEXT,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_name TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    date INTEGER NOT NULL,
    account_id INTEGER,
    transaction_id INTEGER,
    recurrence_id INTEGER,
    is_paid INTEGER DEFAULT 0,
    is_percentage INTEGER DEFAULT 0,
    ignores_interest INTEGER DEFAULT 0,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS monthly_balances (
    month_key TEXT PRIMARY KEY,
    income REAL DEFAULT 0,
    expense REAL DEFAULT 0,
    total REAL DEFAULT 0
  );

  -- Insert a default account if the table is completely empty
  INSERT INTO accounts (name, type, balance, icon, color)
  SELECT 'Dinheiro', 'cash', 0, 'wallet-outline', '#4CAF50'
  WHERE NOT EXISTS (SELECT 1 FROM accounts);
`);

try { expoDb.execSync('ALTER TABLE transactions ADD COLUMN note TEXT;'); } catch (e) {}
try { expoDb.execSync('ALTER TABLE transactions ADD COLUMN is_pending INTEGER DEFAULT 0;'); } catch (e) {}
try { expoDb.execSync('ALTER TABLE transactions ADD COLUMN is_ignored INTEGER DEFAULT 0;'); } catch (e) {}
try { expoDb.execSync('ALTER TABLE transactions ADD COLUMN recurrence_id INTEGER;'); } catch (e) {}
try { expoDb.execSync('ALTER TABLE categories ADD COLUMN macro TEXT;'); } catch (e) {}
try { expoDb.execSync('ALTER TABLE debts ADD COLUMN transaction_id INTEGER;'); } catch (e) {}
try { expoDb.execSync('ALTER TABLE debts ADD COLUMN recurrence_id INTEGER;'); } catch (e) {}
try { expoDb.execSync('ALTER TABLE debts ADD COLUMN is_paid INTEGER DEFAULT 0;'); } catch (e) {}
try { expoDb.execSync('ALTER TABLE debts ADD COLUMN is_percentage INTEGER DEFAULT 0;'); } catch (e) {}
try { expoDb.execSync('ALTER TABLE debts ADD COLUMN ignores_interest INTEGER DEFAULT 0;'); } catch (e) {}
try { expoDb.execSync('ALTER TABLE debts ADD COLUMN description TEXT;'); } catch (e) {}
try { expoDb.execSync('ALTER TABLE accounts ADD COLUMN associated_account_id INTEGER;'); } catch (e) {}
try { expoDb.execSync('ALTER TABLE accounts ADD COLUMN closing_day INTEGER;'); } catch (e) {}
try { expoDb.execSync('ALTER TABLE accounts ADD COLUMN due_day INTEGER;'); } catch (e) {}
try { expoDb.execSync('ALTER TABLE accounts ADD COLUMN credit_limit REAL;'); } catch (e) {}

// Índices para otimização de performance
try { expoDb.execSync('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);'); } catch (e) {}
try { expoDb.execSync('CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);'); } catch (e) {}
try { expoDb.execSync('CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);'); } catch (e) {}
try { expoDb.execSync('CREATE INDEX IF NOT EXISTS idx_debts_transaction ON debts(transaction_id);'); } catch (e) {}

expoDb.execSync(`
  INSERT INTO categories (name, icon, color, macro)
  SELECT 'Receitas', 'cash', '#4CAF50', 'Outros'
  WHERE NOT EXISTS (SELECT 1 FROM categories);
  
  INSERT INTO categories (name, icon, color, macro)
  SELECT 'Transporte', 'car', '#FF9800', 'Essenciais'
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Transporte');

  INSERT INTO categories (name, icon, color, macro)
  SELECT 'Alimentação', 'restaurant', '#F44336', 'Essenciais'
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Alimentação');

  INSERT INTO categories (name, icon, color, macro)
  SELECT 'Mercado', 'cart', '#2196F3', 'Essenciais'
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Mercado');

  INSERT INTO categories (name, icon, color, macro)
  SELECT 'Lazer & Assinaturas', 'play-circle', '#9C27B0', 'Estilo de Vida'
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Lazer & Assinaturas');

  INSERT INTO categories (name, icon, color, macro)
  SELECT 'Saúde', 'medkit', '#E91E63', 'Essenciais'
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Saúde');
`);

// Envelopa a conexão com o Drizzle ORM
export const db = drizzle(expoDb);
