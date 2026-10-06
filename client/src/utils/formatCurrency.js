/** Format a number as Indian-style currency, e.g. 12345.6 -> "₹12,345.60". */
export function formatCurrency(value, options = {}) {
  const { decimals = 2, showSign = false } = options;
  const amount = Number(value);

  if (!Number.isFinite(amount)) return '₹0.00';

  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const sign = showSign && amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${sign}₹${formatted.replace('-', '')}`;
}

export default formatCurrency;
