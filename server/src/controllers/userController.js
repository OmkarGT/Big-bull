import { pool, queryOne } from '../config/db.js';
import { getPortfolio } from '../services/portfolioService.js';
import { notFound } from '../utils/errors.js';
import { validateCapitalAmount, validateProfileUpdate } from '../utils/validation.js';

/** GET /api/users/profile */
export async function getProfile(req, res) {
  const user = await queryOne(
    'SELECT id, name, email, virtual_balance, created_at, updated_at FROM users WHERE id = ?',
    [req.userId]
  );

  if (!user) throw notFound('User not found');

  const portfolio = await getPortfolio(req.userId);

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      virtual_balance: Number(user.virtual_balance),
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
    summary: {
      portfolio_value: portfolio.portfolio_value,
      total_pnl: portfolio.total_pnl,
      total_pnl_percent: portfolio.total_pnl_percent,
      holdings_count: portfolio.holdings_count,
      trades_count: portfolio.trades_count,
    },
  });
}

/** PUT /api/users/profile - update the display name. */
export async function updateProfile(req, res) {
  const { name } = validateProfileUpdate(req.body);

  // MySQL has no RETURNING, so the change is applied first and the fresh row is
  // read back in a second statement.
  await pool.query('UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
    name,
    req.userId,
  ]);

  const user = await queryOne(
    'SELECT id, name, email, virtual_balance, created_at, updated_at FROM users WHERE id = ?',
    [req.userId]
  );

  if (!user) throw notFound('User not found');

  res.json({
    success: true,
    message: 'Profile updated',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      virtual_balance: Number(user.virtual_balance),
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
  });
}

/**
 * POST /api/users/reset-capital
 * Sets the practice capital and wipes holdings + trade history in one
 * transaction. The user starts over, which is why the UI warns them.
 */
export async function resetCapital(req, res) {
  const amount = validateCapitalAmount(req.body?.capital ?? req.body?.amount);

  const client = await pool.getConnection();

  try {
    await client.beginTransaction();

    const [lockedUsers] = await client.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [
      req.userId,
    ]);
    if (lockedUsers.length === 0) throw notFound('User not found');

    // Clear the practice portfolio and history.
    await client.query('DELETE FROM trades WHERE user_id = ?', [req.userId]);
    await client.query('DELETE FROM holdings WHERE user_id = ?', [req.userId]);

    // Set the new virtual balance (the database CHECK keeps it >= 0).
    await client.query(
      'UPDATE users SET virtual_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [amount.toFixed(2), req.userId]
    );

    // MySQL has no RETURNING, so the updated row is read back here.
    const [updatedRows] = await client.query(
      'SELECT id, name, email, virtual_balance, created_at, updated_at FROM users WHERE id = ?',
      [req.userId]
    );
    const updated = updatedRows[0];

    await client.commit();

    res.json({
      success: true,
      message: `Practice capital reset to INR ${amount.toFixed(2)}. Holdings and trade history were cleared.`,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        virtual_balance: Number(updated.virtual_balance),
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      },
      portfolio: await getPortfolio(req.userId),
    });
  } catch (error) {
    await client.rollback();
    throw error;
  } finally {
    client.release();
  }
}
