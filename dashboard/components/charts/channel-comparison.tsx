'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { GitCompareArrows } from 'lucide-react';

const chartConfig = {
  revenue: { label: 'Faturamento', color: '#ae2dac' },
  count: { label: 'Pedidos', color: '#2dd4bf' },
} satisfies ChartConfig;

interface ChannelComparisonProps {
  channelSplit: {
    pdv: { revenue: number; count: number };
    online: { revenue: number; count: number };
  };
  loading?: boolean;
}

export function ChannelComparison({ channelSplit, loading }: ChannelComparisonProps) {
  const data = [
    { name: 'PDV', revenue: channelSplit.pdv.revenue, count: channelSplit.pdv.count },
    { name: 'Online', revenue: channelSplit.online.revenue, count: channelSplit.online.count },
  ];

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 pb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15">
          <GitCompareArrows className="h-3.5 w-3.5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Comparação de Canais</h3>
          <p className="text-[10px] text-muted-foreground/60">PDV vs Online</p>
        </div>
      </div>
      <div className="px-5 pb-4">
        {loading ? (
          <Skeleton className="h-[250px] w-full shimmer rounded-lg" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-acai/10 border border-acai/10 p-3 text-center transition-all duration-200 hover:bg-acai/15 hover:border-acai/20">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">PDV (Balcão)</p>
                <p className="text-lg font-bold text-acai mt-1">{formatCurrency(channelSplit.pdv.revenue)}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">{channelSplit.pdv.count} vendas</p>
              </div>
              <div className="rounded-xl bg-teal/10 border border-teal/10 p-3 text-center transition-all duration-200 hover:bg-teal/15 hover:border-teal/20">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Online</p>
                <p className="text-lg font-bold text-teal mt-1">{formatCurrency(channelSplit.online.revenue)}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">{channelSplit.online.count} pedidos</p>
              </div>
            </div>
            <ChartContainer config={chartConfig} className="h-[140px] w-full">
              <BarChart data={data} layout="vertical" margin={{ top: 0, right: 5, bottom: 0, left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={10} tickFormatter={(v) => `R$${v}`} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" fontSize={11} width={50} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="#ae2dac" radius={[0, 6, 6, 0]} fillOpacity={0.85} />
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </div>
    </div>
  );
}
