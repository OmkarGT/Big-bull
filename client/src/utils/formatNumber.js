/** Plain number with Indian grouping, e.g. 1234567 -> "12,34,567". */
export function formatNumber(value, decimals = 2) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '0';

  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Percentage with an explicit sign, e.g. 1.238 -> "+1.24%". */
export function formatPercent(value, decimals = 2) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '0.00%';

  const sign = amount > 0 ? '+' : '';
  return `${sign}${amount.toFixed(decimals)}%`;
}

/** Short date/time stamp used in tables. */
export function formatDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Green / red / muted text classes for a numeric P&L or price change. */
export function pnlColor(value) {
  const amount = Number(value) || 0;
  if (amount > 0) return 'text-bull-600';
  if (amount < 0) return 'text-red-600';
  return 'text-ink-500';
}

/** Background pill classes for a numeric change. */
export function pnlBadgeColor(value) {
  const amount = Number(value) || 0;
  if (amount > 0) return 'bg-bull-50 text-bull-700';
  if (amount < 0) return 'bg-red-50 text-red-700';
  return 'bg-ink-50 text-ink-500';
}
