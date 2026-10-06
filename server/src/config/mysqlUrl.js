// Parses DATABASE_URL into a mysql2 pool configuration.
//
// This lives apart from db.js on purpose: scripts/migrate.js needs a
// connection before the database exists, and setting up the schema should not
// also require JWT_SECRET to be filled in. Only DATABASE_URL is needed here.
import 'dotenv/config';

/**
 * Turns DATABASE_URL (a mysql:// connection string) into the option object
 * mysql2 expects:
 *
 *   mysql://user:password@localhost:3306/big_bull
 *
 * Set includeDatabase to false to address the server itself, which is what
 * scripts/migrate.js needs before the database has been created.
 */
export function buildPoolConfig({ includeDatabase = true } = {}) {
  const url = new URL(process.env.DATABASE_URL);

  return {
    host: decodeURIComponent(url.hostname),
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ...(includeDatabase ? { database: decodeURIComponent(url.pathname.replace(/^\//, '')) } : {}),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4_unicode_ci',
    // Current_timestamp is written by MySQL and read back as UTC, which is the
    // same instant-based behaviour the PostgreSQL timestamptz columns had.
    timezone: 'Z',
    // Every money column is DECIMAL. Parsing it to a JS number here keeps the
    // JSON sent to the client identical to the PostgreSQL version's output.
    decimalNumbers: true,
    // COUNT(*) comes back as a number as long as it fits a JS safe integer.
    supportBigNumbers: true,
    bigNumberStrings: false,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };
}

export default buildPoolConfig;