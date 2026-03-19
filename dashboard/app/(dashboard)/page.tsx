'use client';

import { useDashboard } from './context';
import { useMetrics, useStockSummary } from '@/hooks/use-dashboard';
import { KpiCard } from '@/components/kpi-card';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { HourlyChart } from '@/components/charts/hourly-chart';
import { PaymentDonut } from '@/components/charts/payment-donut';
import { ChannelComparison } from '@/components/charts/channel-comparison';
import { TopProductsChart } from '@/components/charts/top-products-chart';
import { formatCurrency } from '@/lib/format';
import { DollarSign, ShoppingCart, Receipt, XCircle, Package, AlertTriangle, Ban } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { startDate, endDate, channel } = useDashboard();
  const { data: metrics, isLoading } = useMetrics(startDate, endDate, channel);
  const { data: stockSummary } = useStockSummary();

  const defaultSplit = { pdv: { revenue: 0, count: 0 }, online: { revenue: 0, count: 0 } };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4 stagger-children">
        <KpiCard
          title="Faturamento"
          value={formatCurrency(metrics?.totalRevenue ?? 0)}
          icon={DollarSign}
          loading={isLoading}
          variant="acai"
        />
        <KpiCard
          title="Vendas"
          value={String(metrics?.orderCount ?? 0)}
          subtitle={metrics ? `Ticket médio: ${formatCurrency(metrics.avgTicket)}` : undefined}
          icon={ShoppingCart}
          loading={isLoading}
          variant="teal"
        />
        <KpiCard
          title="Ticket Médio"
          value={formatCurrency(metrics?.avgTicket ?? 0)}
          icon={Receipt}
          loading={isLoading}
          variant="amber"
        />
        <KpiCard
          title="Cancelamentos"
          value={String(metrics?.canceledCount ?? 0)}
          icon={XCircle}
          loading={isLoading}
          variant="red"
        />
      </div>

      {/* Revenue by Day */}
      <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
        <RevenueChart data={metrics?.revenueByDay ?? []} loading={isLoading} />
      </div>

      {/* Hourly + Payment */}
      <div className="grid gap-4 lg:grid-cols-2 stagger-children">
        <HourlyChart data={metrics?.revenueByHour ?? []} loading={isLoading} />
        <PaymentDonut data={metrics?.paymentBreakdown ?? []} loading={isLoading} />
      </div>

      {/* Channel Comparison + Top Products */}
      <div className="grid gap-4 lg:grid-cols-3 stagger-children">
        <ChannelComparison channelSplit={metrics?.channelSplit ?? defaultSplit} loading={isLoading} />
        <TopProductsChart data={metrics?.topProducts ?? []} loading={isLoading} />
      </div>

      {/* Stock Summary */}
      {stockSummary && (
        <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold">Estoque</h3>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-[10px] uppercase text-muted-foreground/50">Total</p>
              <p className="text-xl font-bold text-foreground">{stockSummary.totalProducts}</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-400" />
                <p className="text-[10px] uppercase text-muted-foreground/50">Baixo</p>
              </div>
              <p className="text-xl font-bold text-amber-400">{stockSummary.lowStock}</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <Ban className="h-3 w-3 text-red-400" />
                <p className="text-[10px] uppercase text-muted-foreground/50">Zerado</p>
              </div>
              <p className="text-xl font-bold text-red-400">{stockSummary.outOfStock}</p>
            </div>
          </div>
          {stockSummary.criticalProducts.length > 0 && (
            <div className="glass-card rounded-xl overflow-hidden">
              <table className="w-full">
                <tbody>
                  {stockSummary.criticalProducts.map((p: any) => (
                    <tr key={p.id} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-4 py-2 text-sm">{p.name}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={cn(
                          'text-xs font-mono font-semibold',
                          p.status === 'out' ? 'text-red-400' : 'text-amber-400'
                        )}>
                          {p.currentStock} {p.minStock != null ? `/ ${p.minStock}` : ''}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link href="/estoque" className="text-xs text-acai hover:underline mt-2 inline-block">
            Ver estoque completo →
          </Link>
        </div>
      )}
    </div>
  );
}
