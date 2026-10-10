import pg from 'pg';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect whether we are connecting to PostgreSQL (Supabase / Render) or local SQLite
const dbUrl = config.databaseUrl || process.env.DATABASE_URL || '';
const isPostgresUrl = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');

let pool = null;
let sqliteDb = null;

if (isPostgresUrl) {
  // ============================================================================
  // Supabase PostgreSQL Connection Pool Configuration
  // ============================================================================
  const isLocalhostPg = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

  pool = new Pool({
    connectionString: dbUrl,
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '10000', 10),
    ssl: !isLocalhostPg && config.dbSsl ? { rejectUnauthorized: false } : false,
  });

  // Handle unexpected connection pool errors on idle clients
  pool.on('error', (err) => {
    console.error('[PostgreSQL Pool] Unexpected error on idle database client:', err.message);
  });

  console.log('[Database] PostgreSQL Connection Pool initialized for Supabase/Production.');
} else {
  // ============================================================================
  // Local SQLite Fallback (Used during offline unit tests or local development)
  // ============================================================================
  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  sqliteDb = new Database(config.dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('synchronous = NORMAL');
  sqliteDb.pragma('foreign_keys = ON');

  const schemaPath = path.resolve(__dirname, './schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
    sqliteDb.exec(schemaSQL);
  }

  console.log(`[Database] SQLite connected successfully at: ${config.dbPath}`);
}

/**
 * Converts SQLite-style '?' placeholders into PostgreSQL-style '$1, $2, ...' placeholders
 * and normalizes common SQLite syntax to PostgreSQL where applicable.
 *
 * @param {string} sql
 * @returns {string}
 */
export function normalizeSqlForPostgres(sql) {
  let paramIndex = 1;
  let converted = sql.replace(/\?/g, () => `$${paramIndex++}`);

  // Replace SQLite datetime('now') with PostgreSQL NOW()
  converted = converted.replace(/datetime\('now'\)/gi, 'NOW()');

  // Replace SQLite INSERT OR IGNORE with PostgreSQL ON CONFLICT DO NOTHING
  if (/INSERT\s+OR\s+IGNORE\s+INTO/i.test(converted)) {
    converted = converted.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
    if (!/ON\s+CONFLICT/i.test(converted)) {
      converted += ' ON CONFLICT DO NOTHING';
    }
  }

  return converted;
}

/**
 * Execute parameterized query using the active database driver (PostgreSQL Pool or SQLite)
 *
 * @param {string} sql SQL query string
 * @param {Array} [params] Parameters array
 * @returns {Promise<{ rows: Array, rowCount: number }>}
 */
export async function query(sql, params = []) {
  if (isPostgresUrl && pool) {
    const pgSql = normalizeSqlForPostgres(sql);
    const start = Date.now();
    try {
      const res = await pool.query(pgSql, params);
      return {
        rows: res.rows,
        rowCount: res.rowCount,
        fields: res.fields,
      };
    } catch (err) {
      console.error(`[PostgreSQL Query Error] ${err.message}\nSQL: ${pgSql}\nParams:`, params);
      throw err;
    }
  }

  // SQLite execution fallback
  try {
    const trimmed = sql.trim();
    const isSelect = /^SELECT/i.test(trimmed);
    const stmt = sqliteDb.prepare(sql);

    if (isSelect) {
      const rows = stmt.all(...params);
      return { rows, rowCount: rows.length };
    } else {
      const info = stmt.run(...params);
      return {
        rows: [],
        rowCount: info.changes,
        lastInsertRowid: info.lastInsertRowid,
      };
    }
  } catch (err) {
    console.error(`[SQLite Query Error] ${err.message}\nSQL: ${sql}\nParams:`, params);
    throw err;
  }
}

/**
 * Health check endpoint helper for database connectivity
 */
export async function checkDbHealth() {
  if (isPostgresUrl && pool) {
    try {
      const start = Date.now();
      const res = await pool.query('SELECT NOW() AS server_time, current_database() AS database_name');
      const latencyMs = Date.now() - start;
      return {
        connected: true,
        provider: 'postgresql',
        database: res.rows[0]?.database_name,
        serverTime: res.rows[0]?.server_time,
        latencyMs,
      };
    } catch (err) {
      return {
        connected: false,
        provider: 'postgresql',
        error: err.message,
      };
    }
  }

  return {
    connected: true,
    provider: 'sqlite',
    database: config.dbPath,
    latencyMs: 0,
  };
}

/**
 * High-compatibility `db` wrapper
 * Allows services to run both synchronously (for SQLite) or asynchronously (for PostgreSQL)
 */
export const db = {
  isPostgres: isPostgresUrl,
  pool,
  sqliteDb,
  query,

  /**
   * Closes the active database connection or pool cleanly
   */
  async close() {
    if (pool) {
      await pool.end();
      console.log('[PostgreSQL Pool] All connections closed.');
    }
    if (sqliteDb) {
      sqliteDb.close();
      console.log('[SQLite] Database closed.');
    }
  },

  /**
   * Prepares and executes a statement with synchronous and asynchronous API support
   * @param {string} sql
   */
  prepare(sql) {
    if (isPostgresUrl && pool) {
      const pgSql = normalizeSqlForPostgres(sql);
      return {
        async all(...params) {
          const res = await pool.query(pgSql, params);
          return res.rows;
        },
        async get(...params) {
          const res = await pool.query(pgSql, params);
          return res.rows[0] || null;
        },
        async run(...params) {
          const res = await pool.query(pgSql, params);
          return {
            changes: res.rowCount,
            rowCount: res.rowCount,
          };
        },
      };
    }

    // Direct SQLite prepare
    return sqliteDb.prepare(sql);
  },

  /**
   * Execute raw SQL string directly (e.g. migration script)
   * @param {string} sql
   */
  async exec(sql) {
    if (isPostgresUrl && pool) {
      return await pool.query(sql);
    }
    return sqliteDb.exec(sql);
  },
};

export default {
  db,
  pool,
  query,
  checkDbHealth,
};
