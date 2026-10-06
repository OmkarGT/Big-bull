import mysql from 'mysql2/promise';
import './env.js';
import { buildPoolConfig } from './mysqlUrl.js';

// A single pool is shared by the whole app. All queries in this project use
// `?` placeholders so user input is never glued into SQL strings.
export const pool = mysql.createPool(buildPoolConfig());

// Pin every connection to UTC so CURRENT_TIMESTAMP writes UTC and mysql2 reads
// it back as UTC. Without this a MySQL server running in a local time zone
// would silently shift every created_at / recorded_at value.
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'", (error) => {
    if (error) console.error('[db] could not set session time zone:', error.message);
  });
});

/**
 * Run a query and hand back the rows.
 * mysql2 resolves with a [rows, fields] tuple, so only the rows escape here.
 */
export async function query(text, params = []) {
  const [rows] = await pool.query(text, params);
  return rows;
}

/** Convenience helper: first row or null. */
export async function queryOne(text, params = []) {
  const rows = await query(text, params);
  return rows[0] || null;
}

/** Verify the database is reachable. Called once on server start. */
export async function testConnection() {
  const row = await queryOne('SELECT 1 AS ok');
  return Number(row?.ok) === 1;
}

export { buildPoolConfig };
export default pool;