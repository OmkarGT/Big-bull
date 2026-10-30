// Resolves the MySQL connection string and turns it into a mysql2 pool
// configuration.
//
// This lives apart from db.js on purpose: scripts/migrate.js needs a
// connection before the database exists, and setting up the schema should not
// also require JWT_SECRET to be filled in. Only the database variables are
// needed here.
import './dotenv.js';

/**
 * Returns the MySQL connection string to use, or null when nothing is
 * configured yet.
 *
 * Accepted, in priority order:
 *
 *   1. DATABASE_URL  - verbatim. Used by server/.env locally and by Railway's
 *                      `${{MySQL.DATABASE_URL}}` reference.
 *   2. MYSQL_URL     - the name the Railway MySQL plugin exposes.
 *   3. discrete MYSQL_* or DB_* variables, so a connection string never has
 *      to be hand-assembled or URL-encoded (passwords containing @, / or #
 *      break a hand-written URL).
 */
export function resolveDatabaseUrl() {
  const explicit = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (explicit && explicit.trim()) return explicit.trim();

  const host = process.env.MYSQLHOST || process.env.MYSQL_HOST || process.env.DB_HOST;
  if (!host) return null;

  const user = process.env.MYSQLUSER || process.env.MYSQL_USER || process.env.DB_USER || 'root';
  const password =
    process.env.MYSQLPASSWORD ?? process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD ?? '';
  const port = process.env.MYSQLPORT || process.env.MYSQL_PORT || process.env.DB_PORT || '3306';
  const database =
    process.env.MYSQLDATABASE ||
    process.env.MYSQL_DATABASE ||
    process.env.DB_DATABASE ||
    process.env.DB_NAME ||
    '';

  return (
    `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}` +
    `@${encodeURIComponent(host)}:${port}/${encodeURIComponent(database)}`
  );
}

/**
 * Returns a human-readable reason the connection string cannot be used, or
 * null when it looks fine.
 *
 * Without this a value like `https://...` parses happily as a URL (host
 * `https://` minus scheme), the pool points at port 443 and every query fails
 * with a bare ETIMEDOUT that says nothing about the real mistake.
 */
export function databaseUrlProblem() {
  const url = resolveDatabaseUrl();

  if (!url) {
    return 'DATABASE_URL is not set';
  }

  if (!/^mysql(\+[a-z0-9]+)?:\/\//i.test(url)) {
    return `DATABASE_URL must be a MySQL connection string such as mysql://user:pass@host:3306/big_bull (got "${url.slice(0, 60)}")`;
  }

  return null;
}

/**
 * Turns the connection string into the option object mysql2 expects:
 *
 *   mysql://user:password@localhost:3306/big_bull
 *
 * Set includeDatabase to false to address the server itself, which is what
 * scripts/migrate.js needs before the database has been created.
 */
export function buildPoolConfig({ includeDatabase = true } = {}) {
  const url = new URL(resolveDatabaseUrl());

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

export default resolveDatabaseUrl;