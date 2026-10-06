/**
 * Applies database/schema.sql and database/seed.sql.
 *
 * Run it from the project root with:  npm run db:setup
 *
 * The MySQL client (`mysql`, `psql`-style shell redirects) is not required and
 * the same command works on Windows, macOS and Linux. It also creates the
 * database first if it is missing, so `createdb` is not needed either.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { buildPoolConfig } from '../src/config/mysqlUrl.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const databaseDir = path.resolve(here, '..', '..', 'database');

const FILES = ['schema.sql', 'seed.sql'];

function createPool() {
  // includeDatabase: false - the database may not exist yet.
  const config = buildPoolConfig({ includeDatabase: false });
  return mysql.createPool({
    ...config,
    multipleStatements: true,
    connectionLimit: 1,
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('\nDATABASE_URL is missing.');
    console.error('Copy server/.env.example to server/.env and fill in the values.\n');
    process.exit(1);
  }

  const { database } = buildPoolConfig();
  const pool = createPool();

  try {
    // 1. Make sure the database exists.
    await pool.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`[db:setup] database '${database}' is ready`);

    // 2. Apply the SQL files in order.
    for (const file of FILES) {
      const filePath = path.join(databaseDir, file);
      const sql = await fs.readFile(filePath, 'utf8');

      await pool.query(`USE \`${database}\``);
      await pool.query(sql);

      console.log(`[db:setup] applied ${file}`);
    }

    console.log('[db:setup] done. Start the server with: npm run dev');
  } catch (error) {
    console.error('[db:setup] failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();