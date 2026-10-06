import { formatCurrency } from '../utils/formatCurrency.js';
import { formatPercent, pnlColor } from '../utils/formatNumber.js';

/**
 * Mobile-friendly card for one simulated stock.
 * The table (StockTable) is hidden below the `sm` breakpoint.
 */
export default function StockCard({ stock, onSelect, selected }) {
  return (
    <div
      className={`bb-card p-4 transition ${selected ? 'ring-2 ring-bull-500' : 'hover:shadow-md'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="rounded-md bg-ink-900 px-2 py-1 text-[11px] font-bold text-white">
            {stock.symbol}
          </span>
          <p className="mt-2 truncate text-sm font-semibold text-ink-900">{stock.company_name}</p>
        </div>

        <div className="text-right">
          <p className="text-base font-black tabular-nums text-ink-900">
            {formatCurrency(stock.current_price)}
          </p>
          <p className={`text-xs font-semibold tabular-nums ${pnlColor(stock.change)}`}>
            {formatCurrency(stock.change, { showSign: true })} ({formatPercent(stock.change_percent)})
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelect?.(stock)}
        className="bb-btn-buy mt-3 w-full py-1.5 text-xs"
      >
        BUY
      </button>
    </div>
  );
}
