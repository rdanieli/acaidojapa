'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock } from 'lucide-react';
import { formatHour } from '@/lib/format';

const chartConfig = {
  total: { label: 'Vendas', color: '#ae2dac' },
} satisfies ChartConfig;

interface HourlyChartProps {
  data: { hour: number; total: number }[];
  loading?: boolean;
}

export function HourlyChart({ data, loading }: HourlyChartProps) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 pb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal/15">
          <Clock className="h-3.5 w-3.5 text-teal" />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Distribuição por Hora</h3>
          <p className="text-[10px] text-muted-foreground/60">Horários de pico de vendas</p>
        </div>
      </div>
      <div className="px-5 pb-4">
        {loading ? (
          <Skeleton className="h-[250px] w-full shimmer rounded-lg" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={data} margin={{ top: 10, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hour" tickFormatter={formatHour} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickFormatter={(v) => `R$${v}`} width={55} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="total" fill="#ae2dac" radius={[3, 3, 0, 0]} fillOpacity={0.85} />
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
