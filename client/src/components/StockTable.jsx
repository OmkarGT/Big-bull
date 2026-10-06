import { formatCurrency } from '../utils/formatCurrency.js';
import { formatPercent, pnlColor } from '../utils/formatNumber.js';

/**
 * Responsive table of the 12 simulated stocks.
 * Hidden on very small screens, where StockCard takes over.
 */
export default function StockTable({ stocks = [], onSelect, selectedId }) {
  if (stocks.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-ink-500">No stocks available.</p>;
  }

  return (
    <div className="hidden overflow-x-auto sm:block">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Symbol</th>
            <th className="px-4 py-3 font-semibold">Company</th>
            <th className="px-4 py-3 text-right font-semibold">Simulated Price</th>
            <th className="px-4 py-3 text-right font-semibold">Change</th>
            <th className="px-4 py-3 text-right font-semibold">% Change</th>
            <th className="px-4 py-3 text-right font-semibold">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-ink-100">
          {stocks.map((stock) => (
            <tr
              key={stock.id}
              className={`transition hover:bg-ink-50 ${
                selectedId === stock.id ? 'bg-bull-50/60' : ''
              }`}
            >
              <td className="px-4 py-3">
                <span className="rounded-md bg-ink-900 px-2 py-1 text-xs font-bold text-white">
                  {stock.symbol}
                </span>
              </td>

              <td className="px-4 py-3 font-medium text-ink-900">{stock.company_name}</td>

              <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-900">
                {formatCurrency(stock.current_price)}
              </td>

              <td className={`px-4 py-3 text-right font-semibold tabular-nums ${pnlColor(stock.change)}`}>
                {formatCurrency(stock.change, { showSign: true })}
              </td>

              <td
                className={`px-4 py-3 text-right font-semibold tabular-nums ${pnlColor(stock.change_percent)}`}
              >
                {formatPercent(stock.change_percent)}
              </td>

              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onSelect?.(stock)}
                  className="bb-btn-buy px-3 py-1.5 text-xs"
                >
                  BUY
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
