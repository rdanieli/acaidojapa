'use client';

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';

const chartConfig = {
  pdv: { label: 'PDV', color: '#ae2dac' },
  online: { label: 'Online', color: '#2dd4bf' },
} satisfies ChartConfig;

interface RevenueChartProps {
  data: { date: string; pdv: number; online: number }[];
  loading?: boolean;
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  return (
    <div className="glass-card rounded-xl col-span-2 overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 pb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-acai/15">
          <TrendingUp className="h-3.5 w-3.5 text-acai" />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Faturamento por Dia</h3>
          <p className="text-[10px] text-muted-foreground/60">Evolução diária de receita por canal</p>
        </div>
      </div>
      <div className="px-5 pb-4">
        {loading ? (
          <Skeleton className="h-[260px] w-full shimmer rounded-lg" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[260px] w-full">
            <AreaChart data={data} margin={{ top: 10, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradPdv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ae2dac" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#ae2dac" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOnline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
              <Area
                type="monotone"
                dataKey="pdv"
                stackId="1"
                stroke="#ae2dac"
                strokeWidth={2}
                fill="url(#gradPdv)"
              />
              <Area
                type="monotone"
                dataKey="online"
                stackId="1"
                stroke="#2dd4bf"
                strokeWidth={2}
                fill="url(#gradOnline)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
