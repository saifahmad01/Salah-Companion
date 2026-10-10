import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the directory for the database file exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite connection
export const db = new Database(config.dbPath, {
  // verbose: config.nodeEnv === 'development' ? console.log : null,
});

// Configure SQLite for high performance and integrity
db.pragma('journal_mode = WAL');     // Write-Ahead Logging for high concurrency
db.pragma('synchronous = NORMAL');   // Faster writes while maintaining durability
db.pragma('foreign_keys = ON');      // Enforce relational foreign keys

// Execute initial schema
const schemaPath = path.resolve(__dirname, './schema.sql');
if (fs.existsSync(schemaPath)) {
  const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schemaSQL);
}

console.log(`[Database] SQLite connected successfully at: ${config.dbPath}`);
