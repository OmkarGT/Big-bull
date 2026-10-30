import { env } from '../config/env.js';
import { pool } from '../config/db.js';

/**
 * SIMULATED PRICE ENGINE
 * ----------------------
 * Big Bull has no connection to any real stock exchange. Prices move
 * because this function invents a small random walk every few seconds.
 *
 * Rules kept deliberately simple:
 *   - base price = the stock's current simulated price
 *   - movement   = random value scaled by a per-stock volatility
 *   - new price  = current * (1 + movement), rounded to 2 decimals
 *   - prices can never reach zero (MIN_PRICE floor)
 *   - previous_price becomes the old current_price so the UI can show
 *     the change and percentage change
 */

// Small-cap style names move more than large fictional banks.
const VOLATILITY_BY_SYMBOL = {
  CHINTU: 0.008,
  GODI: 0.007,
  RAMU: 0.007,
  MAYA: 0.009,
  GRAMIN: 0.003,
  TUKTUK: 0.008,
  PW: 0.005,
  KABJI: 0.005,
  IRTCT: 0.004,
  CHASMA: 0.006,
  MAHASHAKTI: 0.006,
  BULL: 0.005,
};

const DEFAULT_VOLATILITY = 0.006;
const MAX_MOVEMENT = 0.01; // never move more than +/- 1% in one tick
const MIN_PRICE = 1; // hard floor so a price can never reach zero

let timer = null;
let running = false;

// Each tick writes one price_history row per stock (12 rows). Unlimited growth
// is what filled the Railway MySQL volume, so old points are deleted about
// once an hour. Start at the limit so an oversized table is trimmed on boot.
const PRUNE_EVERY_TICKS = Math.max(
  1,
  Math.round(3_600_000 / Math.max(env.priceEngineIntervalMs, 1))
);
let ticksSincePrune = PRUNE_EVERY_TICKS;

/** Round to 2 decimal places without float surprises. */
function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Random percentage movement for one tick, in the range -vol..+vol. */
function pickMovement(volatility) {
  const raw = (Math.random() * 2 - 1) * volatility;
  return Math.max(-MAX_MOVEMENT, Math.min(MAX_MOVEMENT, raw));
}

/**
 * Drop price points older than the retention window.
 *
 * Age is compared using the connection's session time zone, which db.js pins
 * to UTC - the same clock CURRENT_TIMESTAMP writes with.
 */
async function prunePriceHistory(client) {
  const [result] = await client.query(
    'DELETE FROM price_history WHERE recorded_at < (NOW() - INTERVAL ? HOUR)',
    [env.historyRetentionHours]
  );

  if (result.affectedRows > 0) {
    console.log(
      `[price-engine] pruned ${result.affectedRows} price points older than ` +
        `${env.historyRetentionHours}h`
    );
  }
}

/**
 * Runs one simulated tick over every stock.
 * Exported so it can be called manually (useful while testing).
 */
export async function tickPrices() {
  const client = await pool.getConnection();

  try {
    await client.beginTransaction();

    const [stocks] = await client.query('SELECT id, symbol, current_price FROM stocks ORDER BY id');

    for (const stock of stocks) {
      const currentPrice = Number(stock.current_price);
      const volatility = VOLATILITY_BY_SYMBOL[stock.symbol] ?? DEFAULT_VOLATILITY;
      const movement = pickMovement(volatility);

      let newPrice = round2(currentPrice * (1 + movement));
      if (newPrice < MIN_PRICE) newPrice = MIN_PRICE;

      await client.query(
        `UPDATE stocks
            SET previous_price = current_price,
                current_price  = ?,
                updated_at     = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [newPrice, stock.id]
      );

      await client.query('INSERT INTO price_history (stock_id, price) VALUES (?, ?)', [
        stock.id,
        newPrice,
      ]);
    }

    await client.commit();
    console.log(`[price-engine] simulated tick applied to ${stocks.length} stocks`);

    // Housekeeping never fails a tick - the prices are already committed.
    ticksSincePrune += 1;
    if (ticksSincePrune >= PRUNE_EVERY_TICKS) {
      ticksSincePrune = 0;

      try {
        await prunePriceHistory(client);
      } catch (error) {
        console.error('[price-engine] could not prune price history:', error.message);
      }
    }
  } catch (error) {
    await client.rollback();
    console.error('[price-engine] tick failed:', error.message);
  } finally {
    client.release();
  }
}

/** Start the engine. Safe to call once from server.js. */
export function startPriceEngine() {
  if (running) return;

  running = true;
  tickPrices();
  timer = setInterval(tickPrices, env.priceEngineIntervalMs);
  console.log(
    `[price-engine] started (simulated, ticking every ${env.priceEngineIntervalMs}ms)`
  );
}

/** Stop the engine cleanly on server shutdown. */
export function stopPriceEngine() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  running = false;
  console.log('[price-engine] stopped');
}

export function isPriceEngineRunning() {
  return running;
}
