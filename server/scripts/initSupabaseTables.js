import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL || process.argv[2];

if (!dbUrl || (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://'))) {
  console.error('\n❌ ERROR: Valid PostgreSQL connection string required in DATABASE_URL.');
  console.error('Format: postgresql://postgres.[ref]:[PASSWORD]@[host]:[port]/postgres\n');
  process.exit(1);
}

console.log('\n🚀 Initializing Salah Companion tables in Supabase PostgreSQL...');

const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
const client = new Client({
  connectionString: dbUrl,
  ssl: !isLocalhost ? { rejectUnauthorized: false } : false,
});

async function run() {
  try {
    await client.connect();
    console.log('✓ Connected to Supabase PostgreSQL database.');

    const schemaPath = path.resolve(__dirname, '../prisma/migrations/supabase_production_schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');

    console.log('Executing production schema DDL...');
    await client.query(sql);
    console.log('✓ All 7 tables, extensions, constraints, triggers, and indexes created successfully!');

    // Verify created tables
    const res = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\n📊 Public Tables in Database:');
    res.rows.forEach((r) => console.log(`  - ${r.table_name}`));

    console.log('\n🎉 Supabase PostgreSQL Schema Setup Complete!\n');
  } catch (err) {
    console.error('\n❌ Migration Failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
