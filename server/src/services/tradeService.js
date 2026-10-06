import { pool, query } from '../config/db.js';
import { badRequest, notFound } from '../utils/errors.js';
import { validateQuantity, validateStockId } from '../utils/validation.js';

/**
 * All money maths happens here, on the backend. The frontend only sends
 * { stockId, quantity } - never a price, balance or total.
 *
 * Every BUY and SELL runs inside a database transaction so the balance,
 * the holding row and the trade record can never disagree.
 */

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Lock the user row for the rest of the transaction. */
async function lockUser(client, userId) {
  const [rows] = await client.query(
    'SELECT id, virtual_balance FROM users WHERE id = ? FOR UPDATE',
    [userId]
  );
  if (rows.length === 0) throw notFound('User not found');
  return rows[0];
}

/** Lock and read the current simulated price of a stock. */
async function lockStock(client, stockId) {
  const [rows] = await client.query(
    'SELECT id, symbol, company_name, current_price FROM stocks WHERE id = ? FOR UPDATE',
    [stockId]
  );
  if (rows.length === 0) throw notFound('Stock not found');
  return rows[0];
}

/**
 * Read back the trade row that was just inserted. MySQL has no RETURNING, so
 * the insert reports only an id and the audit row is fetched separately.
 */
async function readTrade(client, tradeId) {
  const [rows] = await client.query(
    `SELECT id, user_id, stock_id, type, quantity, price, total_amount, created_at
       FROM trades
      WHERE id = ?`,
    [tradeId]
  );
  return rows[0];
}

/**
 * BUY: charge virtual cash, then create or top up the holding.
 * Averages the cost so average_buy_price stays meaningful.
 */
export async function buyStock(userId, payload = {}) {
  const stockId = validateStockId(payload.stockId);
  const quantity = validateQuantity(payload.quantity);

  const client = await pool.getConnection();

  try {
    await client.beginTransaction();

    const user = await lockUser(client, userId);
    const stock = await lockStock(client, stockId);

    const price = Number(stock.current_price);
    const totalCost = round2(price * quantity);
    const balance = Number(user.virtual_balance);

    if (balance < totalCost) {
      throw badRequest('Insufficient virtual balance for this purchase');
    }

    // 1. Deduct cash (guard keeps the balance >= 0 at the DB level too).
    await client.query(
      'UPDATE users SET virtual_balance = virtual_balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [totalCost, userId]
    );

    // 2. Create or update the holding and recalculate the average price.
    const [existingRows] = await client.query(
      'SELECT quantity, average_buy_price FROM holdings WHERE user_id = ? AND stock_id = ? FOR UPDATE',
      [userId, stockId]
    );

    if (existingRows.length === 0) {
      await client.query(
        `INSERT INTO holdings (user_id, stock_id, quantity, average_buy_price)
         VALUES (?, ?, ?, ?)`,
        [userId, stockId, quantity, price]
      );
    } else {
      const existing = existingRows[0];
      const oldQuantity = Number(existing.quantity);
      const oldAverage = Number(existing.average_buy_price);
      const newQuantity = oldQuantity + quantity;
      const newAverage = round2(
        (oldQuantity * oldAverage + quantity * price) / newQuantity
      );

      await client.query(
        `UPDATE holdings
            SET quantity = ?, average_buy_price = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND stock_id = ?`,
        [newQuantity, newAverage, userId, stockId]
      );
    }

    // 3. Record the trade.
    const [insertResult] = await client.query(
      `INSERT INTO trades (user_id, stock_id, type, quantity, price, total_amount)
       VALUES (?, ?, 'BUY', ?, ?, ?)`,
      [userId, stockId, quantity, price, totalCost]
    );

    const trade = await readTrade(client, insertResult.insertId);

    await client.commit();

    return {
      trade,
      stock: { id: stock.id, symbol: stock.symbol, company_name: stock.company_name },
      side: 'BUY',
      price,
      total_amount: totalCost,
    };
  } catch (error) {
    await client.rollback();
    throw error;
  } finally {
    client.release();
  }
}

/**
 * SELL: verify the shares exist, credit cash, reduce the holding and
 * delete the row once the quantity reaches zero.
 */
export async function sellStock(userId, payload = {}) {
  const stockId = validateStockId(payload.stockId);
  const quantity = validateQuantity(payload.quantity);

  const client = await pool.getConnection();

  try {
    await client.beginTransaction();

    const user = await lockUser(client, userId);
    const stock = await lockStock(client, stockId);

    const [holdingRows] = await client.query(
      'SELECT id, quantity FROM holdings WHERE user_id = ? AND stock_id = ? FOR UPDATE',
      [userId, stockId]
    );

    if (holdingRows.length === 0) {
      throw badRequest('You do not own any shares of this stock');
    }

    const owned = Number(holdingRows[0].quantity);
    if (owned < quantity) {
      throw badRequest(`Not enough shares. You own ${owned} share(s) of ${stock.symbol}`);
    }

    const price = Number(stock.current_price);
    const proceeds = round2(price * quantity);

    // 1. Credit the user.
    await client.query(
      'UPDATE users SET virtual_balance = virtual_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [proceeds, userId]
    );

    // 2. Reduce (or remove) the holding.
    const remaining = owned - quantity;
    if (remaining === 0) {
      await client.query('DELETE FROM holdings WHERE id = ?', [holdingRows[0].id]);
    } else {
      await client.query(
        'UPDATE holdings SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [remaining, holdingRows[0].id]
      );
    }

    // 3. Record the trade.
    const [insertResult] = await client.query(
      `INSERT INTO trades (user_id, stock_id, type, quantity, price, total_amount)
       VALUES (?, ?, 'SELL', ?, ?, ?)`,
      [userId, stockId, quantity, price, proceeds]
    );

    const trade = await readTrade(client, insertResult.insertId);

    await client.commit();

    return {
      trade,
      stock: { id: stock.id, symbol: stock.symbol, company_name: stock.company_name },
      side: 'SELL',
      price,
      total_amount: proceeds,
    };
  } catch (error) {
    await client.rollback();
    throw error;
  } finally {
    client.release();
  }
}

/** Paginated trade history for the signed-in user, newest first. */
export async function listTrades(userId, limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);

  return query(
    `SELECT t.id,
            t.type,
            t.quantity,
            t.price,
            t.total_amount,
            t.created_at,
            s.id   AS stock_id,
            s.symbol,
            s.company_name
       FROM trades t
       JOIN stocks s ON s.id = t.stock_id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT ?`,
    [userId, safeLimit]
  );
}

export { round2 };
