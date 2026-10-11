import pg from 'pg';
import dotenv from 'dotenv';

// Load variables from backend/.env
dotenv.config();

const { Pool } = pg;

// Create our reusable connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Keep up to 20 reusable connections open
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if pool is full
});

// Test the connection on startup
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database pool');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL error:', err);
});

export default pool;