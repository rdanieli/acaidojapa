'use client';

import { Bar, BarChart, XAxis, YAxis, Cell, Pie, PieChart, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, PieChart as PieChartIcon } from 'lucide-react';

const COLORS = ['#ae2dac', '#2dd4bf', '#f59e0b', '#6366f1', '#ef4444', '#22c55e'];

const barConfig = {
  amount: { label: 'Total', color: '#2dd4bf' },
} satisfies ChartConfig;

interface PurchasesByCategoryProps {
  data: { category: string; label: string; amount: number }[];
  loading?: boolean;
}

export function PurchasesByCategoryChart({ data, loading }: PurchasesByCategoryProps) {
  const config: ChartConfig = {};
  data.forEach((d, i) => {
    config[d.label] = { label: d.label, color: COLORS[i % COLORS.length] };
  });

  const chartData = data.map(d => ({ name: d.label, value: d.amount }));

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 pb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15">
          <PieChartIcon className="h-3.5 w-3.5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Gastos por Categoria</h3>
          <p className="text-[10px] text-muted-foreground/60">Distribuição de compras</p>
        </div>
      </div>
      <div className="px-5 pb-4">
        {loading ? (
          <Skeleton className="h-[250px] w-full shimmer rounded-lg" />
        ) : chartData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground/60">
            Sem dados de compras no período
          </div>
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

interface PurchasesTimelineProps {
  data: { date: string; amount: number }[];
  loading?: boolean;
}

export function PurchasesTimelineChart({ data, loading }: PurchasesTimelineProps) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 pb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal/15">
          <ShoppingCart className="h-3.5 w-3.5 text-teal" />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Compras ao Longo do Tempo</h3>
          <p className="text-[10px] text-muted-foreground/60">Gastos diários com insumos</p>
        </div>
      </div>
      <div className="px-5 pb-4">
        {loading ? (
          <Skeleton className="h-[250px] w-full shimmer rounded-lg" />
        ) : data.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground/60">
            Sem dados de compras no período
          </div>
        ) : (
          <ChartContainer config={barConfig} className="h-[250px] w-full">
            <BarChart data={data} margin={{ top: 10, right: 5, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="date"
                tickFormatter={(v) => {
                  const d = new Date(v + 'T12:00:00');
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis fontSize={11} tickFormatter={(v) => `R$${v}`} width={60} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="amount" fill="#2dd4bf" radius={[6, 6, 0, 0]} fillOpacity={0.85} />
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
