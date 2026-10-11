import initSqlJs from 'sql.js';
import { drizzle } from 'drizzle-orm/sql-js';

// No web, o banco roda em memória (sql.js) e é persistido no localStorage.
export let expoDb = null;
export let db = null;

export const openRestoredDatabase = () => {
  throw new Error('Restoring a SQLite database file is not supported on web');
};

let persistCurrentDatabase = () => {};

export const flushWebDb = () => persistCurrentDatabase();

const STORAGE_KEY = 'zenocash_web_db';
const PERSIST_INTERVAL_MS = 2000;

const loadStoredDb = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const binary = atob(stored);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch (e) {
    console.warn('Falha ao carregar banco salvo no navegador:', e);
    return null;
  }
};

const setupPersistence = (sqlite) => {
  let lastSavedChanges = -1;
  const persist = () => {
    try {
      const changes = sqlite.exec('SELECT total_changes()')[0]?.values[0]?.[0] ?? 0;
      if (changes === lastSavedChanges) return;
      const bytes = sqlite.export();
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      window.localStorage.setItem(STORAGE_KEY, btoa(binary));
      lastSavedChanges = changes;
    } catch (e) {
      console.warn('Falha ao salvar banco no navegador:', e);
    }
  };
  persistCurrentDatabase = persist;
  setInterval(persist, PERSIST_INTERVAL_MS);
  window.addEventListener('beforeunload', persist);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persist();
  });
};

export const initWebDb = async () => {
  if (db) return db;
  
  const SQL = await initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.14.2/sql-wasm.wasm`
  });
  
  const sqlite = new SQL.Database(loadStoredDb() || undefined);
  
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
      credit_limit REAL,
      sort_order INTEGER
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
      macro TEXT,
      sort_order INTEGER
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

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      kind TEXT DEFAULT 'ongoing',
      start_date INTEGER,
      end_date INTEGER,
      budget REAL,
      is_archived INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      sort_order INTEGER
    );

    CREATE TABLE IF NOT EXISTS transaction_groups (
      transaction_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      PRIMARY KEY (transaction_id, group_id)
    );

    CREATE TABLE IF NOT EXISTS recurrence_groups (
      recurrence_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      PRIMARY KEY (recurrence_id, group_id)
    );

    CREATE TABLE IF NOT EXISTS group_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      keywords TEXT,
      category_ids TEXT,
      account_id INTEGER,
      min_amount REAL,
      max_amount REAL,
      date_from INTEGER,
      date_to INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transaction_groups_group ON transaction_groups(group_id);
    CREATE INDEX IF NOT EXISTS idx_group_rules_group ON group_rules(group_id);
  `);

  try { sqlite.run('ALTER TABLE accounts ADD COLUMN sort_order INTEGER;'); } catch (e) {}
  try { sqlite.run('ALTER TABLE categories ADD COLUMN sort_order INTEGER;'); } catch (e) {}
  try { sqlite.run('ALTER TABLE groups ADD COLUMN sort_order INTEGER;'); } catch (e) {}
  try { sqlite.run('ALTER TABLE transactions ADD COLUMN source_text TEXT;'); } catch (e) {}
  try { sqlite.run('ALTER TABLE transactions ADD COLUMN ai_status TEXT;'); } catch (e) {}

  // A estrutura e o seed das tabelas serão feitos na chamada seedDatabase() de seed.js
  db = drizzle(sqlite);
  setupPersistence(sqlite);

  // Criar o mock do expoDb para compatibilidade com partes nativas do código
  expoDb = {
    execSync: (q) => sqlite.run(q),
    execAsync: async q => sqlite.exec(q),
    runAsync: async (q, params) => {
      sqlite.run(q, params || []);
      const res = sqlite.exec('SELECT last_insert_rowid()');
      return { lastInsertRowId: res[0]?.values[0]?.[0] || 0 };
    },
    withTransactionAsync: async callback => {
      sqlite.run('BEGIN TRANSACTION');
      try {
        await callback();
        sqlite.run('COMMIT');
      } catch (error) {
        sqlite.run('ROLLBACK');
        throw error;
      }
    },
    getFirstSync: (q, params) => {
      const stmt = sqlite.prepare(q);
      if (params) stmt.bind(params);
      const row = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();
      return row;
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
