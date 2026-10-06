import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../utils/formatCurrency.js';

/**
 * Simple line chart of recent simulated prices.
 * Deliberately plain - the data only has two fields (time, price).
 */
export default function PriceChart({ history = [], symbol }) {
  const data = useMemo(
    () =>
      history.map((point, index) => ({
        index: index + 1,
        time: new Date(point.recorded_at).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        price: Number(point.price),
      })),
    [history]
  );

  if (data.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-ink-200 text-sm text-ink-500">
        Collecting simulated price history...
      </div>
    );
  }

  const prices = data.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  // Keep a little headroom so the line never touches the chart edges.
  const padding = Math.max((max - min) * 0.15, max * 0.005, 1);

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            interval="preserveStartEnd"
            minTickGap={24}
            stroke="#d5d9e2"
          />
          <YAxis
            domain={[Number((min - padding).toFixed(2)), Number((max + padding).toFixed(2))]}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            width={62}
            stroke="#d5d9e2"
            tickFormatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: '1px solid #d5d9e2',
              fontSize: 12,
            }}
            labelStyle={{ color: '#6b7280' }}
            formatter={(value) => [formatCurrency(value), `Simulated ${symbol || ''} price`.trim()]}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#0d8a4c"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
