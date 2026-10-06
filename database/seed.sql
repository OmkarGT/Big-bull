-- =============================================================
-- Big Bull - Seed Data (MySQL 8.0+)
-- Every company below is FICTIONAL and created only for this
-- educational demo. Symbols loosely echo real companies but the
-- names, prices and behaviour are invented.
--
-- MySQL has no `ON CONFLICT ... DO NOTHING`, so idempotency comes
-- from INSERT IGNORE, which skips rows that would violate a UNIQUE
-- key or CHECK constraint.
-- =============================================================

INSERT IGNORE INTO stocks (symbol, company_name, current_price, previous_price) VALUES
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
  ('BULL',      'Big Bull Industries', 500.00,   500.00);

-- Give the seeded stocks a short synthetic history so the price
-- chart is not completely empty on the very first page load.
INSERT IGNORE INTO price_history (stock_id, price)
SELECT s.id, s.current_price
FROM stocks s;