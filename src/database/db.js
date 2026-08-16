import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

// Inicializa a conexão nativa com o banco do Expo
const expoDb = openDatabaseSync('zenocash.db');

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
  
  -- Insert a default account if the table is completely empty
  INSERT INTO accounts (name, type, balance, icon, color)
  SELECT 'Dinheiro', 'cash', 0, 'wallet-outline', '#4CAF50'
  WHERE NOT EXISTS (SELECT 1 FROM accounts);
`);

try { expoDb.execSync('ALTER TABLE transactions ADD COLUMN note TEXT;'); } catch (e) {}
try { expoDb.execSync('ALTER TABLE transactions ADD COLUMN is_pending INTEGER DEFAULT 0;'); } catch (e) {}
try { expoDb.execSync('ALTER TABLE categories ADD COLUMN macro TEXT;'); } catch (e) {}

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
