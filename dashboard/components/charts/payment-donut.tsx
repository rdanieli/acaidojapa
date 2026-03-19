'use client';

import { Cell, Pie, PieChart, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet } from 'lucide-react';

const COLORS = ['#ae2dac', '#2dd4bf', '#f59e0b', '#6366f1', '#ef4444', '#22c55e', '#8b5cf6', '#ec4899'];

interface PaymentDonutProps {
  data: { method: string; amount: number; count: number }[];
  loading?: boolean;
}

export function PaymentDonut({ data, loading }: PaymentDonutProps) {
  const config: ChartConfig = {};
  data.forEach((d, i) => {
    config[d.method] = { label: d.method, color: COLORS[i % COLORS.length] };
  });

  const chartData = data.map((d) => ({ name: d.method, value: d.amount }));

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 pb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15">
          <Wallet className="h-3.5 w-3.5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Formas de Pagamento</h3>
          <p className="text-[10px] text-muted-foreground/60">Distribuição por método</p>
        </div>
      </div>
      <div className="px-5 pb-4">
        {loading ? (
          <Skeleton className="h-[250px] w-full shimmer rounded-lg" />
        ) : (
          <ChartContainer config={config} className="h-[250px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={85}
                dataKey="value"
                nameKey="name"
                strokeWidth={2}
                stroke="oklch(0.10 0.005 300)"
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} fillOpacity={0.85} />
                ))}
              </Pie>
              <Legend
                formatter={(value) => <span className="text-xs text-foreground/80">{value}</span>}
              />
            </PieChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
