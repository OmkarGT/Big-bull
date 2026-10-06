import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  BadgeIndianRupee,
  Briefcase,
  RefreshCw,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Loading from '../components/Loading.jsx';
import PortfolioCard from '../components/PortfolioCard.jsx';
import StockTable from '../components/StockTable.jsx';
import StockCard from '../components/StockCard.jsx';
import TradePanel from '../components/TradePanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { stockApi, tradeApi } from '../services/api.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { formatDateTime, formatNumber } from '../utils/formatNumber.js';

const POLL_INTERVAL_MS = 7000;

export default function Dashboard() {
  const { refreshUser } = useAuth();

  const [stocks, setStocks] = useState([]);
  const [market, setMarket] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [trades, setTrades] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const selectedStockIdRef = useRef(null);

  /** Load the simulated market list. */
  const loadStocks = useCallback(async () => {
    const data = await stockApi.list();
    setStocks(data.stocks);
    setMarket(data.market);
    return data.stocks;
  }, []);

  /** Load the portfolio summary (cash, holdings, P&L). */
  const loadPortfolio = useCallback(async () => {
    const data = await tradeApi.portfolio();
    setPortfolio(data.portfolio);
    return data.portfolio;
  }, []);

  /** Load the recent trade history. */
  const loadTrades = useCallback(async () => {
    const data = await tradeApi.trades(8);
    setTrades(data.trades);
  }, []);

  /** Load the price history for the selected stock. */
  const loadHistory = useCallback(async (stockId) => {
    if (!stockId) {
      setHistory([]);
      return;
    }
    const data = await stockApi.history(stockId, 60);
    setHistory(data.history);
  }, []);

  // Initial load.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const list = await loadStocks();
        if (cancelled) return;

        // Auto-select the first stock so the trade panel is never empty.
        if (list.length > 0) {
          selectedStockIdRef.current = list[0].id;
          setSelectedStock(list[0]);
        }

        await Promise.all([loadPortfolio(), loadTrades()]);
        if (cancelled) return;

        setLastUpdated(new Date());
      } catch (loadError) {
        if (!cancelled) setError(loadError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [loadStocks, loadPortfolio, loadTrades]);

  // Poll prices and the chart roughly every 7 seconds.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const list = await loadStocks();
        await loadHistory(selectedStockIdRef.current);
        setLastUpdated(new Date());
        setError('');

        // Keep the trade panel on a valid selection after a re-render.
        if (selectedStockIdRef.current) {
          const stillThere = list.find((stock) => stock.id === selectedStockIdRef.current);
          if (stillThere) setSelectedStock(stillThere);
        }
      } catch (pollError) {
        setError(pollError.message);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [loadStocks, loadHistory]);

  function handleSelectStock(stock) {
    if (!stock) return;
    selectedStockIdRef.current = stock.id;
    setSelectedStock(stock);
    loadHistory(stock.id).catch((historyError) => setError(historyError.message));
  }

  /** Manual refresh of prices, portfolio and the selected chart. */
  async function handleManualRefresh() {
    try {
      const list = await loadStocks();
      await Promise.all([loadPortfolio(), loadTrades(), loadHistory(selectedStockIdRef.current)]);
      setLastUpdated(new Date());
      setError('');

      const stillThere = list.find((stock) => stock.id === selectedStockIdRef.current);
      if (stillThere) setSelectedStock(stillThere);
    } catch (refreshError) {
      setError(refreshError.message);
    }
  }

  /** Called after a successful trade: refresh everything that changed. */
  async function handleTrade(result) {
    try {
      if (result?.portfolio) setPortfolio(result.portfolio);
      else await loadPortfolio();

      await Promise.all([loadStocks(), loadTrades(), loadHistory(selectedStockIdRef.current)]);
      await refreshUser(result?.user ?? null);
      setLastUpdated(new Date());
    } catch (refreshError) {
      setError(refreshError.message);
    }
  }

  const holdingForSelected = portfolio?.holdings?.find(
    (holding) => holding.stock_id === selectedStock?.id
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-50">
        <Navbar />
        <Loading label="Loading the simulated market..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight text-ink-900 sm:text-2xl">
              Dashboard
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-bull-50 px-2 py-0.5 font-bold text-bull-700">
                <Activity className="h-3.5 w-3.5" />
                Simulated market {market?.is_open ? 'open 24/7' : 'closed'}
              </span>
              <span>Paper trading &middot; virtual money only</span>
              {lastUpdated && <span>&middot; updated {formatDateTime(lastUpdated)}</span>}
            </p>
          </div>

          <button type="button" className="bb-btn-ghost" onClick={handleManualRefresh}>
            <RefreshCw className="h-4 w-4" /> Refresh prices
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        {/* Summary cards */}
        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PortfolioCard
            label="Available Cash"
            value={formatCurrency(portfolio?.available_cash ?? 0)}
            sublabel="Virtual INR ready to trade"
            icon={Wallet}
          />
          <PortfolioCard
            label="Portfolio Value"
            value={formatCurrency(portfolio?.portfolio_value ?? 0)}
            sublabel="Cash + current market value"
            icon={Briefcase}
          />
          <PortfolioCard
            label="Total P&L"
            value={formatCurrency(portfolio?.total_pnl ?? 0, { showSign: true })}
            change={portfolio?.total_pnl ?? 0}
            changePercent={portfolio?.total_pnl_percent ?? 0}
            sublabel="Unrealised, on simulated prices"
            icon={TrendingUp}
            accent={(portfolio?.total_pnl ?? 0) >= 0 ? 'positive' : 'negative'}
          />
          <PortfolioCard
            label="Holdings"
            value={formatNumber(portfolio?.holdings_count ?? 0, 0)}
            sublabel={`Practice capital ${formatCurrency(portfolio?.practice_capital ?? 0)}`}
            icon={BadgeIndianRupee}
          />
        </section>

        {/* Market + trade panel */}
        <section className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="bb-card overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-3">
                <h2 className="text-base font-bold text-ink-900">Live Simulated Market</h2>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  {stocks.length} fictional stocks
                </span>
              </div>

              <StockTable
                stocks={stocks}
                onSelect={handleSelectStock}
                selectedId={selectedStock?.id}
              />

              {/* Card list replaces the table on phones */}
              <div className="grid gap-3 p-3 sm:hidden">
                {stocks.map((stock) => (
                  <StockCard
                    key={stock.id}
                    stock={stock}
                    selected={stock.id === selectedStock?.id}
                    onSelect={handleSelectStock}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <TradePanel
              stock={selectedStock}
              history={history}
              holding={holdingForSelected}
              cash={portfolio?.available_cash ?? 0}
              onTrade={handleTrade}
            />
          </div>
        </section>

        {/* Recent trades */}
        <section className="mt-6">
          <div className="bb-card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-3">
              <h2 className="text-base font-bold text-ink-900">Recent Trades</h2>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Simulated fills
              </span>
            </div>

            {trades.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-500">
                No trades yet. Use the BUY button on any stock to place your first simulated order.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
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
                        <td className="px-4 py-2.5 font-medium text-ink-900">{trade.symbol}</td>
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
