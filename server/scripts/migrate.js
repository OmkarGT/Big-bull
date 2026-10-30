/**
 * Applies database/schema.sql and database/seed.sql.
 *
 * Run it from the project root with:  npm run db:setup
 *
 * The `mysql` command-line client is not required, and the same command works
 * on Windows, macOS and Linux. It also creates the database first if it is
 * missing, so creating it by hand is not needed either.
 *
 * WARNING: schema.sql drops and recreates every table. Run it once when
 * provisioning a database (and again only when you deliberately want a fresh
 * one) - it is NOT a safe "run on every deploy" migration.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { buildPoolConfig, databaseUrlProblem } from '../src/config/mysqlUrl.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const databaseDir = path.resolve(here, '..', '..', 'database');

const FILES = ['schema.sql', 'seed.sql'];

async function main() {
  const dbProblem = databaseUrlProblem();
  if (dbProblem) {
    console.error(`\nCannot connect to MySQL: ${dbProblem}`);
    console.error('Set DATABASE_URL (or MYSQLHOST / MYSQLUSER / MYSQLDATABASE) and try again.\n');
    process.exit(1);
  }

  const { database } = buildPoolConfig();

  if (!database) {
    console.error('\nThe connection string has no database name.');
    console.error('Append it, e.g. DATABASE_URL=mysql://user:pass@host:3306/big_bull\n');
    process.exit(1);
  }

  // Connect to the server itself rather than the target database, because the
  // database may not exist yet.
  const pool = mysql.createPool({
    ...buildPoolConfig({ includeDatabase: false }),
    multipleStatements: true,
    connectionLimit: 1,
  });

  // One dedicated connection: `USE` only lasts for the session, so keeping
  // every statement below on the same connection makes it unambiguous.
  const connection = await pool.getConnection();

  try {
    // Create the database only if it is genuinely missing. Checking first
    // avoids a permission error on hosts where the application user may use
    // the database but is not allowed to create one (common on managed MySQL).
    const [existing] = await connection.query(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [database]
    );

    if (existing.length === 0) {
      await connection.query(
        `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log(`[db:setup] created database '${database}'`);
    } else {
      console.log(`[db:setup] using existing database '${database}'`);
    }

    await connection.query(`USE \`${database}\``);

    for (const file of FILES) {
      const sql = await fs.readFile(path.join(databaseDir, file), 'utf8');

      await connection.query(sql);

      console.log(`[db:setup] applied ${file}`);
    }

    console.log('[db:setup] done. Start the server with: npm run dev');
  } catch (error) {
    console.error('[db:setup] failed:', error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

main();