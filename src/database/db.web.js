import initSqlJs from 'sql.js';
import { drizzle } from 'drizzle-orm/sql-js';

// No web, o banco será em memória e instanciado assincronamente.
export let expoDb = null;
export let db = null;

export const initWebDb = async () => {
  if (db) return db;
  
  const SQL = await initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.14.2/sql-wasm.wasm`
  });
  
  const sqlite = new SQL.Database();
  
  // Criação das tabelas
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'checking',
      balance REAL DEFAULT 0,
      icon TEXT,
      color TEXT,
      associated_account_id INTEGER,
      closing_day INTEGER,
      due_day INTEGER,
      credit_limit REAL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category_id INTEGER,
      type TEXT NOT NULL,
      date INTEGER NOT NULL,
      account_id INTEGER,
      note TEXT,
      is_pending INTEGER DEFAULT 0,
      is_ignored INTEGER DEFAULT 0,
      recurrence_id INTEGER
    );
    
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      macro TEXT
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
  `);

  // A estrutura e o seed das tabelas serão feitos na chamada seedDatabase() de seed.js
  db = drizzle(sqlite);

  // Criar o mock do expoDb para compatibilidade com partes nativas do código
  expoDb = {
    execSync: (q) => sqlite.run(q),
    runAsync: async (q, params) => {
      sqlite.run(q, params || []);
      const res = sqlite.exec('SELECT last_insert_rowid()');
      return { lastInsertRowId: res[0]?.values[0]?.[0] || 0 };
    },
    getAllAsync: async (q, params) => {
      const stmt = sqlite.prepare(q);
      if (params) stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    }
  };

  return db;
};
