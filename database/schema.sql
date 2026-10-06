-- =============================================================
-- Big Bull - Database Schema (MySQL 8.0+)
-- Fictional / demo paper-trading platform. No real market data.
-- Money is stored as DECIMAL(14,2) to avoid floating point errors.
--
-- Run it with either of:
--   npm run db:setup                            (recommended)
--   mysql -u root -p big_bull < database/schema.sql
-- =============================================================

-- Every table is InnoDB, because the trading transactions need row locks
-- (SELECT ... FOR UPDATE) and real foreign keys.

-- Drop in reverse dependency order so this file is re-runnable.
-- FOREIGN_KEY_CHECKS is off for the drops only, because MySQL will not let
-- you drop a table that another table still references.
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS price_history;
DROP TABLE IF EXISTS trades;
DROP TABLE IF EXISTS holdings;
DROP TABLE IF EXISTS stocks;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- Note: PostgreSQL needed a standalone `CREATE TYPE trade_type` plus a
-- `DROP TYPE`. MySQL declares the enum inline on the trades table, so there
-- is nothing extra to create or drop here.

-- -------------------------------------------------------------
-- users
-- One practice account per person. virtual_balance is the cash the
-- user holds in INR inside the simulation. Always kept >= 0 by the
-- backend inside a transaction.
--
-- email_key is a generated column holding lower(email). MySQL has no
-- expression indexes, so this is how a case-insensitive UNIQUE
-- constraint is expressed - the same job users_email_lower_idx did.
-- -------------------------------------------------------------
CREATE TABLE users (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- stocks
-- The 12 fictional companies of the demo market. previous_price is
-- the price before the latest simulated tick (used to show change).
-- The CHECK constraints guard the simulated engine from reaching zero.
-- -------------------------------------------------------------
CREATE TABLE stocks (
  id             INT NOT NULL AUTO_INCREMENT,
  symbol         VARCHAR(20) NOT NULL,
  company_name   VARCHAR(120) NOT NULL,
  current_price  DECIMAL(14, 2) NOT NULL,
  previous_price DECIMAL(14, 2) NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY stocks_symbol_uq (symbol),
  -- BINARY forces a byte-for-byte, case-sensitive comparison. Without it the
  -- utf8mb4_unicode_ci collation would make this check case-insensitive and a
  -- lowercase symbol would slip through.
  CONSTRAINT stocks_symbol_chk CHECK (BINARY symbol = BINARY UPPER(symbol)),
  CONSTRAINT stocks_current_price_chk CHECK (current_price > 0),
  CONSTRAINT stocks_previous_price_chk CHECK (previous_price > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- holdings
-- At most one row per (user, stock) pair. average_buy_price is the
-- weighted average cost of the shares currently held.
-- -------------------------------------------------------------
CREATE TABLE holdings (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- trades
-- Immutable audit log of every simulated BUY / SELL.
-- type is an inline ENUM instead of PostgreSQL's `trade_type` type.
-- total_amount = quantity * price, stored for reporting only.
-- -------------------------------------------------------------
CREATE TABLE trades (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- price_history
-- Every simulated tick written by server/src/services/priceEngine.js
-- and used by the Recharts price chart.
-- -------------------------------------------------------------
CREATE TABLE price_history (
  id          INT NOT NULL AUTO_INCREMENT,
  stock_id    INT NOT NULL,
  price       DECIMAL(14, 2) NOT NULL,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY price_history_stock_id_recorded_at_idx (stock_id, recorded_at DESC),
  CONSTRAINT price_history_price_chk CHECK (price > 0),
  CONSTRAINT price_history_stock_fk FOREIGN KEY (stock_id) REFERENCES stocks (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;