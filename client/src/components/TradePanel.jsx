import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FlaskConical } from 'lucide-react';
import { tradeApi } from '../services/api.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { formatNumber, pnlColor } from '../utils/formatNumber.js';
import PriceChart from './PriceChart.jsx';

/**
 * BUY / SELL panel for the selected simulated stock.
 *
 * The panel only sends { stockId, quantity }. Price, balance and totals are
 * all decided by the backend, which is the authority for the practice money.
 */
export default function TradePanel({ stock, history = [], holding, cash = 0, onTrade }) {
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message }

  // Clear the form whenever a different stock is selected.
  useEffect(() => {
    setQuantity('');
    setFeedback(null);
  }, [stock?.id]);

  const quantityNumber = Number(quantity);
  const validQuantity = Number.isInteger(quantityNumber) && quantityNumber > 0;
  const estimatedTotal = validQuantity ? Number((quantityNumber * Number(stock?.current_price ?? 0)).toFixed(2)) : 0;

  const ownedShares = holding?.quantity ?? 0;
  const canAfford = estimatedTotal > 0 && estimatedTotal <= Number(cash);
  const canSell = validQuantity && quantityNumber <= ownedShares;

  const hint = useMemo(() => {
    if (!validQuantity) return 'Enter a whole number of shares.';
    if (!canAfford) return 'Not enough virtual cash for this quantity.';
    if (!canSell) return `You only own ${formatNumber(ownedShares, 0)} share(s).`;
    return null;
  }, [validQuantity, canAfford, canSell, ownedShares]);

  async function handleTrade(side) {
    if (!stock || !validQuantity) {
      setFeedback({ type: 'error', message: 'Enter a whole number of shares greater than zero.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const result =
        side === 'BUY'
          ? await tradeApi.buy(stock.id, quantityNumber)
          : await tradeApi.sell(stock.id, quantityNumber);

      setFeedback({ type: 'success', message: result.message });
      setQuantity('');
      await onTrade?.(result);
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  if (!stock) {
    return (
      <div className="bb-card p-5">
        <h2 className="text-base font-bold text-ink-900">Trade Panel</h2>
        <p className="mt-3 text-sm text-ink-500">
          Select a stock from the market table to open its chart and trade ticket.
        </p>
      </div>
    );
  }

  return (
    <div className="bb-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
            <FlaskConical className="h-3.5 w-3.5 text-bull-600" /> Simulated Market
          </p>
          <h2 className="mt-1 text-lg font-black text-ink-900">{stock.company_name}</h2>
          <p className="text-sm font-semibold text-ink-500">{stock.symbol}</p>
        </div>

        <div className="text-right">
          <p className="text-xs text-ink-500">Current simulated price</p>
          <p className="text-2xl font-black tabular-nums text-ink-900">
            {formatCurrency(stock.current_price)}
          </p>
          <p className={`text-xs font-semibold tabular-nums ${pnlColor(stock.change)}`}>
            {formatCurrency(stock.change, { showSign: true })} · {stock.change_percent}%
          </p>
        </div>
      </div>

      <div className="mt-4">
        <PriceChart history={history} symbol={stock.symbol} />
        <p className="mt-1 text-[11px] text-ink-500">
          Recent simulated ticks. Not real exchange data.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-ink-50 p-3 text-sm">
        <div>
          <p className="text-xs text-ink-500">Available cash</p>
          <p className="font-bold text-ink-900">{formatCurrency(cash)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-500">Your holding</p>
          {ownedShares > 0 ? (
            <p className="font-bold text-ink-900">
              {formatNumber(ownedShares, 0)} @ {formatCurrency(holding?.average_buy_price)}
            </p>
          ) : (
            <p className="font-bold text-ink-500">No shares</p>
          )}
        </div>
      </div>

      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleTrade('BUY');
        }}
      >
        <label className="bb-label" htmlFor="trade-quantity">
          Quantity (shares)
        </label>
        <input
          id="trade-quantity"
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          placeholder="e.g. 10"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          className="bb-input"
          disabled={submitting}
        />

        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-ink-500">Estimated total</span>
          <span className="font-bold tabular-nums text-ink-900">
            {validQuantity ? formatCurrency(estimatedTotal) : '₹0.00'}
          </span>
        </div>

        {hint && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>}

        {feedback && (
          <p
            className={`mt-3 flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
              feedback.type === 'success'
                ? 'bg-bull-50 text-bull-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {feedback.message}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="submit" className="bb-btn-buy" disabled={submitting || !validQuantity || !canAfford}>
            {submitting ? 'Working...' : 'BUY'}
          </button>
          <button
            type="button"
            className="bb-btn-sell"
            onClick={() => handleTrade('SELL')}
            disabled={submitting || !validQuantity || !canSell}
          >
            SELL
          </button>
        </div>
      </form>

      <p className="mt-3 text-[11px] text-ink-500">
        Maximum you can buy:{' '}
        <span className="font-semibold">
          {formatNumber(Math.floor(Number(cash) / Number(stock.current_price || 1)), 0)} shares
        </span>
      </p>
    </div>
  );
}
