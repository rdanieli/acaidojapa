'use client';

import { useStockHistory } from '@/hooks/use-dashboard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface StockChartProps {
  productId: number | null;
  days?: number;
  minStock?: number | null;
}

export function StockChart({ productId, days = 30, minStock }: StockChartProps) {
  const { data, isLoading } = useStockHistory(productId, days);

  if (!productId) return null;
  if (isLoading) return <Skeleton className="h-48 w-full shimmer rounded-lg" />;
  if (!data?.history?.length) return <p className="text-xs text-muted-foreground/40 text-center py-8">Sem dados de movimentação</p>;

  const formatDate = (date: string) => {
    const d = new Date(date + 'T12:00:00');
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.history} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            width={45}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelFormatter={formatDate}
            formatter={(value: number) => [`${value} ${data.unit}`, data.productName]}
          />
          {minStock != null && minStock > 0 && (
            <ReferenceLine
              y={minStock}
              stroke="hsl(var(--destructive))"
              strokeDasharray="5 5"
              opacity={0.5}
              label={{ value: 'Mín', fill: 'hsl(var(--destructive))', fontSize: 10, position: 'right' }}
            />
          )}
          <Line
            type="monotone"
            dataKey="stock"
            stroke="hsl(270 60% 55%)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'hsl(270 60% 55%)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
