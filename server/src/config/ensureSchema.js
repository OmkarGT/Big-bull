/**
 * Self-healing schema bootstrap.
 *
 * Railway builds only the `server/` root directory, so `database/schema.sql`
 * (which lives one level above it) does not exist inside the deployed
 * container. That made it impossible to recreate the tables after a wiped
 * MySQL volume - every query failed with ER_NO_SUCH_TABLE, which the API
 * turned into the generic "Something went wrong on our side" response.
 *
 * This module creates whatever is missing on boot. Unlike
 * `npm run db:setup` (which drops and recreates everything) it is
 * NON-DESTRUCTIVE:
 *
 *   - tables use CREATE TABLE IF NOT EXISTS
 *   - the demo stocks use INSERT IGNORE on the UNIQUE symbol
 *   - price history is seeded only while the table is empty
 *
 * Keep the DDL below in sync with database/schema.sql.
 */
import mysql from 'mysql2/promise';
import { query, queryOne } from './db.js';
import { buildPoolConfig } from './mysqlUrl.js';

const CREATE_TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id              INT NOT NULL AUTO_INCREMENT,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    email_key       VARCHAR(255) GENERATED ALWAYS AS (lower(email)) STORED,
    password_hash   VARCHAR(255) NOT NULL,
    virtual_balance DECIMAL(14, 2) NOT NULL DEFAULT 100000.00,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY users_email_uq (email),
    UNIQUE KEY users_email_lower_uq (email_key),
    CONSTRAINT users_name_chk CHECK (CHAR_LENGTH(TRIM(name)) >= 2),
    CONSTRAINT users_virtual_balance_chk CHECK (virtual_balance >= 0)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS stocks (
    id             INT NOT NULL AUTO_INCREMENT,
    symbol         VARCHAR(20) NOT NULL,
    company_name   VARCHAR(120) NOT NULL,
    current_price  DECIMAL(14, 2) NOT NULL,
    previous_price DECIMAL(14, 2) NOT NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY stocks_symbol_uq (symbol),
    CONSTRAINT stocks_symbol_chk CHECK (BINARY symbol = BINARY UPPER(symbol)),
    CONSTRAINT stocks_current_price_chk CHECK (current_price > 0),
    CONSTRAINT stocks_previous_price_chk CHECK (previous_price > 0)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS holdings (
    id                INT NOT NULL AUTO_INCREMENT,
    user_id           INT NOT NULL,
    stock_id          INT NOT NULL,
    quantity          INT NOT NULL,
    average_buy_price DECIMAL(14, 2) NOT NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY holdings_user_stock_uq (user_id, stock_id),
    KEY holdings_user_id_idx (user_id),
    CONSTRAINT holdings_quantity_chk CHECK (quantity > 0),
    CONSTRAINT holdings_average_buy_price_chk CHECK (average_buy_price > 0),
    CONSTRAINT holdings_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT holdings_stock_fk FOREIGN KEY (stock_id) REFERENCES stocks (id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS trades (
    id           INT NOT NULL AUTO_INCREMENT,
    user_id      INT NOT NULL,
    stock_id     INT NOT NULL,
    type         ENUM('BUY', 'SELL') NOT NULL,
    quantity     INT NOT NULL,
    price        DECIMAL(14, 2) NOT NULL,
    total_amount DECIMAL(16, 2) NOT NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY trades_user_id_created_at_idx (user_id, created_at DESC),
    KEY trades_stock_id_idx (stock_id),
    CONSTRAINT trades_quantity_chk CHECK (quantity > 0),
    CONSTRAINT trades_price_chk CHECK (price > 0),
    CONSTRAINT trades_total_amount_chk CHECK (total_amount > 0),
    CONSTRAINT trades_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT trades_stock_fk FOREIGN KEY (stock_id) REFERENCES stocks (id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS price_history (
    id          INT NOT NULL AUTO_INCREMENT,
    stock_id    INT NOT NULL,
    price       DECIMAL(14, 2) NOT NULL,
    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY price_history_stock_id_recorded_at_idx (stock_id, recorded_at DESC),
    CONSTRAINT price_history_price_chk CHECK (price > 0),
    CONSTRAINT price_history_stock_fk FOREIGN KEY (stock_id) REFERENCES stocks (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

const SEED_STOCKS = `INSERT IGNORE INTO stocks (symbol, company_name, current_price, previous_price) VALUES
  ('CHINTU',    'Chintu Sabun',        180.00,   180.00),
  ('GODI',      'Godi Chai',           420.00,   420.00),
  ('RAMU',      'Ramu Chaddar',        275.00,   275.00),
  ('MAYA',      'Maya Sabji',          145.00,   145.00),
  ('GRAMIN',    'Gramin Bank',         1250.00,  1250.00),
  ('TUKTUK',    'Tuktuk Transports',   680.00,   680.00),
  ('PW',        'Physical Wallah',    2150.00,  2150.00),
  ('KABJI',     'Kabji Gas Suppliers', 1780.00,  1780.00),
  ('IRTCT',     'IRTCT',              3250.00,  3250.00),
  ('CHASMA',    'Chasmaghar',          920.00,   920.00),
  ('MAHASHAKTI','Mahashakti Tyres',   3850.00,  3850.00),
  ('BULL',      'Big Bull Industries', 500.00,   500.00)`;

/** Escape a MySQL identifier (the database name comes from env, not a user). */
function quoteIdentifier(name) {
  return `\`${String(name).replace(/`/g, '``')}\``;
}

/**
 * A wiped MySQL volume can leave the configured database missing as well as
 * the tables. Connect without selecting a database and create it if needed.
 */
async function createDatabaseIfMissing() {
  const { database } = buildPoolConfig();
  if (!database) return;

  const connection = await mysql.createConnection(buildPoolConfig({ includeDatabase: false }));

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(database)} ` +
        'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
    console.log(`[db] created missing database '${database}'`);
  } finally {
    await connection.end();
  }
}

async function applySchema() {
  // Order matters because of the foreign keys: users and stocks first.
  for (const statement of CREATE_TABLES) {
    await query(statement);
  }

  await query(SEED_STOCKS);

  // seed.sql uses INSERT IGNORE, but price_history has no UNIQUE key to make
  // that idempotent, so only insert the demo history while it is empty.
  const history = await queryOne('SELECT COUNT(*) AS total FROM price_history');

  if (Number(history?.total) === 0) {
    await query(
      'INSERT INTO price_history (stock_id, price) SELECT id, current_price FROM stocks'
    );
  }
}

/**
 * Ensure the database and all tables exist. Safe to run on every boot.
 * Throws if the schema still cannot be created, so the server fails loudly
 * instead of serving 500s from an empty database.
 */
export async function ensureSchema() {
  try {
    await applySchema();
  } catch (error) {
    if (error.code !== 'ER_BAD_DB_ERROR') throw error;

    await createDatabaseIfMissing();
    await applySchema();
  }

  console.log('[db] schema ready');
}

export default ensureSchema;
