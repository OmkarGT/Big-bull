import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency.js';
import { formatPercent, pnlBadgeColor } from '../utils/formatNumber.js';

/**
 * Small summary card used for cash, portfolio value and total P&L.
 * `change` / `changePercent` are optional and only rendered together.
 */
export default function PortfolioCard({
  label,
  value,
  sublabel,
  change,
  changePercent,
  icon: Icon,
  accent = 'default',
}) {
  const isPositive = Number(change) > 0;
  const isNegative = Number(change) < 0;
  const showChange = change !== undefined && change !== null;

  const accentRing = {
    default: 'text-ink-700 bg-ink-50',
    positive: 'text-bull-700 bg-bull-50',
    negative: 'text-red-700 bg-red-50',
  }[accent];

  return (
    <div className="bb-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
          <p className="mt-1.5 truncate text-2xl font-black text-ink-900">{value}</p>

          {sublabel && <p className="mt-1 text-xs text-ink-500">{sublabel}</p>}

          {showChange && (
            <span
              className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${pnlBadgeColor(change)}`}
            >
              {isPositive && <TrendingUp className="h-3.5 w-3.5" />}
              {isNegative && <TrendingDown className="h-3.5 w-3.5" />}
              {formatCurrency(change, { showSign: true })}
              {changePercent !== undefined && changePercent !== null && (
                <span>({formatPercent(changePercent)})</span>
              )}
            </span>
          )}
        </div>

        {Icon && (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accentRing}`}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </div>
  );
}
