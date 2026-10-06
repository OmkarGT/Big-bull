import { getPortfolio } from '../services/portfolioService.js';
import { buyStock, listTrades, sellStock } from '../services/tradeService.js';

/** GET /api/portfolio */
export async function getPortfolioSummary(req, res) {
  const portfolio = await getPortfolio(req.userId);

  res.json({
    success: true,
    portfolio,
    disclaimer: 'All values use virtual money in a simulated market.',
  });
}

/** GET /api/trades */
export async function getTrades(req, res) {
  const trades = await listTrades(req.userId, req.query.limit);

  res.json({
    success: true,
    count: trades.length,
    trades,
    disclaimer: 'Simulated trades. No real money or broker involved.',
  });
}

/** POST /api/trades/buy - body: { stockId, quantity } */
export async function buy(req, res) {
  const result = await buyStock(req.userId, req.body);

  res.status(201).json({
    success: true,
    message: `Bought ${result.trade.quantity} ${result.stock.symbol} at INR ${Number(
      result.trade.price
    ).toFixed(2)} (simulated)`,
    ...result,
    portfolio: await getPortfolio(req.userId),
  });
}

/** POST /api/trades/sell - body: { stockId, quantity } */
export async function sell(req, res) {
  const result = await sellStock(req.userId, req.body);

  res.json({
    success: true,
    message: `Sold ${result.trade.quantity} ${result.stock.symbol} at INR ${Number(
      result.trade.price
    ).toFixed(2)} (simulated)`,
    ...result,
    portfolio: await getPortfolio(req.userId),
  });
}
