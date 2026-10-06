import { query } from '../config/db.js';
import { round2 } from './tradeService.js';

/**
 * P&L maths, all on the backend so the numbers the user sees are always
 * derived from database values.
 *
 *   market value   = quantity x current simulated price
 *   cost value     = quantity x average buy price
 *   unrealized P&L = market value - cost value
 *   portfolio value= available cash + sum(market value)
 *   total P&L      = portfolio value - practice capital
 */

export async function getPortfolio(userId) {
  // 1. Cash on hand.
  const userRows = await query(
    'SELECT id, name, email, virtual_balance, created_at FROM users WHERE id = ?',
    [userId]
  );
  if (userRows.length === 0) return null;

  const user = userRows[0];
  const cash = round2(Number(user.virtual_balance));

  // 2. Holdings joined with the latest simulated price.
  const holdingRows = await query(
    `SELECT h.id,
            h.stock_id,
            h.quantity,
            h.average_buy_price,
            h.created_at,
            s.symbol,
            s.company_name,
            s.current_price
       FROM holdings h
       JOIN stocks s ON s.id = h.stock_id
      WHERE h.user_id = ?
      ORDER BY s.symbol ASC`,
    [userId]
  );

  const holdings = holdingRows.map((row) => {
    const quantity = Number(row.quantity);
    const averageBuyPrice = round2(Number(row.average_buy_price));
    const currentPrice = round2(Number(row.current_price));

    const investedAmount = round2(quantity * averageBuyPrice);
    const currentValue = round2(quantity * currentPrice);
    const pnl = round2(currentValue - investedAmount);
    const pnlPercent = investedAmount > 0 ? round2((pnl / investedAmount) * 100) : 0;

    return {
      id: row.id,
      stock_id: row.stock_id,
      symbol: row.symbol,
      company_name: row.company_name,
      quantity,
      average_buy_price: averageBuyPrice,
      current_price: currentPrice,
      invested_amount: investedAmount,
      current_value: currentValue,
      pnl,
      pnl_percent: pnlPercent,
      created_at: row.created_at,
    };
  });

  const marketValue = round2(
    holdings.reduce((sum, holding) => sum + holding.current_value, 0)
  );
  const investedAmount = round2(
    holdings.reduce((sum, holding) => sum + holding.invested_amount, 0)
  );
  const unrealizedPnl = round2(marketValue - investedAmount);

  // MySQL's COUNT(*) needs no `::int` cast; supportBigNumbers already hands it
  // back as a JS number, and Number() keeps the JSON type identical.
  const countRows = await query('SELECT COUNT(*) AS trades_count FROM trades WHERE user_id = ?', [
    userId,
  ]);
  const tradesCount = Number(countRows[0]?.trades_count ?? 0);

  const portfolioValue = round2(cash + marketValue);

  // Practice capital is cash + whatever is currently invested. That keeps
  // the P&L honest even after a partial reset and stays consistent with
  // "portfolio value - capital".
  const practiceCapital = round2(cash + investedAmount);
  const totalPnl = round2(portfolioValue - practiceCapital);
  const totalPnlPercent = practiceCapital > 0 ? round2((totalPnl / practiceCapital) * 100) : 0;

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    },
    available_cash: cash,
    market_value: marketValue,
    invested_amount: investedAmount,
    portfolio_value: portfolioValue,
    practice_capital: practiceCapital,
    unrealized_pnl: unrealizedPnl,
    total_pnl: totalPnl,
    total_pnl_percent: totalPnlPercent,
    holdings_count: holdings.length,
    trades_count: tradesCount,
    holdings,
  };
}

export default getPortfolio;
