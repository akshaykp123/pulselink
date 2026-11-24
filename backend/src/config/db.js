import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (process.env.DATABASE_URL?.includes('sslmode=require') || process.env.NODE_ENV === 'production')
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database pool');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL error:', err);
});

// Auto-migration: ensure device_id column and index exist on urls table
export async function initDb() {
  try {
    await pool.query(`
      ALTER TABLE urls ADD COLUMN IF NOT EXISTS device_id VARCHAR(64);
      CREATE INDEX IF NOT EXISTS idx_urls_device_id ON urls(device_id);
    `);
    console.log('✅ Database migration applied: device_id column & index verified');
  } catch (err) {
    console.warn('⚠️ Non-fatal DB migration notice:', err.message);
  }
}

export default pool;
