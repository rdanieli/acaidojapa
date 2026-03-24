'use client';

import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';

const chartConfig = {
  value: { label: 'Valor', color: '#ae2dac' },
} satisfies ChartConfig;

interface TopProductsChartProps {
  data: { name: string; qty: number; revenue: number }[];
  loading?: boolean;
}

export function TopProductsChart({ data, loading }: TopProductsChartProps) {
  const [mode, setMode] = useState<'revenue' | 'qty'>('revenue');

  const top10 = data.slice(0, 10).map((d) => ({
    name: d.name.length > 25 ? d.name.substring(0, 22) + '...' : d.name,
    value: mode === 'revenue' ? d.revenue : d.qty,
    fullName: d.name,
  }));

  return (
    <div className="glass-card rounded-xl col-span-2 overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-acai/15">
            <Trophy className="h-3.5 w-3.5 text-acai" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Top 10 Produtos</h3>
            <p className="text-[10px] text-muted-foreground/60">Produtos mais vendidos</p>
          </div>
        </div>
        <div className="flex rounded-lg bg-muted/60 p-0.5 border border-border">
          <button
            type="button"
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200 cursor-pointer',
              mode === 'revenue'
                ? 'bg-acai/20 text-acai shadow-sm'
                : 'text-muted-foreground/70 hover:text-foreground',
            )}
            onClick={() => setMode('revenue')}
          >
            R$
          </button>
          <button
            type="button"
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200 cursor-pointer',
              mode === 'qty'
                ? 'bg-acai/20 text-acai shadow-sm'
                : 'text-muted-foreground/70 hover:text-foreground',
            )}
            onClick={() => setMode('qty')}
          >
            Qty
          </button>
        </div>
      </div>
      <div className="px-5 pb-4">
        {loading ? (
          <Skeleton className="h-[300px] w-full shimmer rounded-lg" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 10, bottom: 0, left: 120 }}>
              <XAxis
                type="number"
                fontSize={10}
                tickFormatter={(v) => (mode === 'revenue' ? `R$${v}` : String(v))}
                tickLine={false}
                axisLine={false}
              />
              <YAxis type="category" dataKey="name" fontSize={10} width={120} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="#ae2dac" radius={[0, 6, 6, 0]} fillOpacity={0.85} />
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
