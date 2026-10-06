import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, PieChart, TrendingUp, Wallet } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Loading from '../components/Loading.jsx';
import PortfolioCard from '../components/PortfolioCard.jsx';
import { tradeApi } from '../services/api.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { formatDateTime, formatNumber, pnlColor } from '../utils/formatNumber.js';

const POLL_INTERVAL_MS = 7000;

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [portfolioData, tradeData] = await Promise.all([
        tradeApi.portfolio(),
        tradeApi.trades(50),
      ]);
      setPortfolio(portfolioData.portfolio);
      setTrades(tradeData.trades);
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    load().finally(() => {
      if (!cancelled) setLoading(false);
    });

    // Refresh so the P&L follows the simulated prices.
    const interval = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-50">
        <Navbar />
        <Loading label="Calculating your simulated portfolio..." />
      </div>
    );
  }

  const holdings = portfolio?.holdings ?? [];

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <h1 className="text-xl font-black tracking-tight text-ink-900 sm:text-2xl">Portfolio</h1>
        <p className="mt-1 text-xs text-ink-500">
          Holdings valued against live simulated prices. Virtual money only.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PortfolioCard
            label="Available Cash"
            value={formatCurrency(portfolio?.available_cash ?? 0)}
            sublabel="Virtual INR on hand"
            icon={Wallet}
          />
          <PortfolioCard
            label="Invested"
            value={formatCurrency(portfolio?.invested_amount ?? 0)}
            sublabel="Cost value of open positions"
            icon={Briefcase}
          />
          <PortfolioCard
            label="Market Value"
            value={formatCurrency(portfolio?.market_value ?? 0)}
            sublabel="Quantity x simulated price"
            icon={PieChart}
          />
          <PortfolioCard
            label="Total P&L"
            value={formatCurrency(portfolio?.total_pnl ?? 0, { showSign: true })}
            change={portfolio?.total_pnl ?? 0}
            changePercent={portfolio?.total_pnl_percent ?? 0}
            sublabel={`on practice capital ${formatCurrency(portfolio?.practice_capital ?? 0)}`}
            icon={TrendingUp}
            accent={(portfolio?.total_pnl ?? 0) >= 0 ? 'positive' : 'negative'}
          />
        </section>

        {/* Holdings */}
        <section className="mt-6">
          <div className="bb-card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-3">
              <h2 className="text-base font-bold text-ink-900">Your Holdings</h2>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                {holdings.length} open position(s)
              </span>
            </div>

            {holdings.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-ink-500">
                  You do not hold any shares yet.
                </p>
                <Link to="/" className="bb-btn-primary mt-4">
                  Browse the simulated market
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Stock</th>
                      <th className="px-4 py-3 text-right font-semibold">Qty</th>
                      <th className="px-4 py-3 text-right font-semibold">Avg Buy</th>
                      <th className="px-4 py-3 text-right font-semibold">Simulated Price</th>
                      <th className="px-4 py-3 text-right font-semibold">Invested</th>
                      <th className="px-4 py-3 text-right font-semibold">Current Value</th>
                      <th className="px-4 py-3 text-right font-semibold">P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {holdings.map((holding) => (
                      <tr key={holding.id} className="hover:bg-ink-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-ink-900 px-2 py-1 text-[11px] font-bold text-white">
                              {holding.symbol}
                            </span>
                            <span className="font-medium text-ink-900">{holding.company_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink-700">
                          {formatNumber(holding.quantity, 0)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink-700">
                          {formatCurrency(holding.average_buy_price)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink-700">
                          {formatCurrency(holding.current_price)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink-700">
                          {formatCurrency(holding.invested_amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-900">
                          {formatCurrency(holding.current_value)}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold tabular-nums ${pnlColor(holding.pnl)}`}>
                          {formatCurrency(holding.pnl, { showSign: true })}
                          <span className="block text-[11px] font-semibold">
                            {holding.pnl_percent > 0 ? '+' : ''}
                            {holding.pnl_percent.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Full trade history */}
        <section className="mt-6">
          <div className="bb-card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-3">
              <h2 className="text-base font-bold text-ink-900">Trade History</h2>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                {portfolio?.trades_count ?? 0} simulated trade(s)
              </span>
            </div>

            {trades.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-500">
                No trades recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Type</th>
                      <th className="px-4 py-2.5 font-semibold">Stock</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Price</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                      <th className="px-4 py-2.5 text-right font-semibold">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {trades.map((trade) => (
                      <tr key={trade.id} className="hover:bg-ink-50">
                        <td className="px-4 py-2.5">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                              trade.type === 'BUY'
                                ? 'bg-bull-50 text-bull-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {trade.type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-medium text-ink-900">{trade.symbol}</span>
                          <span className="ml-2 text-xs text-ink-500">{trade.company_name}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-ink-700">
                          {formatNumber(trade.quantity, 0)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-ink-700">
                          {formatCurrency(trade.price)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-ink-900">
                          {formatCurrency(trade.total_amount)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs text-ink-500">
                          {formatDateTime(trade.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
