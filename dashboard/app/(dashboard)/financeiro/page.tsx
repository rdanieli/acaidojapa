'use client';

import { useState } from 'react';
import { useDashboard } from '../context';
import { useFinancial, usePurchases } from '@/hooks/use-dashboard';
import { KpiCard } from '@/components/kpi-card';
import { MarginTrendChart } from '@/components/charts/margin-trend-chart';
import { PurchasesByCategoryChart, PurchasesTimelineChart } from '@/components/charts/purchases-chart';
import { MapUnmappedAction } from '@/components/financial/map-unmapped-action';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Percent,
  ShoppingCart,
  Receipt,
  Calculator,
  ArrowUpDown,
  AlertTriangle,
} from 'lucide-react';

type Tab = 'dre' | 'margins' | 'purchases';

export default function FinanceiroPage() {
  const { startDate, endDate } = useDashboard();
  const [tab, setTab] = useState<Tab>('dre');

  const { data: fin, isLoading: finLoading } = useFinancial(startDate, endDate);
  const { data: purchases, isLoading: purchasesLoading } = usePurchases(startDate, endDate);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dre', label: 'Visão Geral' },
    { key: 'margins', label: 'Margem por Produto' },
    { key: 'purchases', label: 'Compras' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1 border border-border w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer',
              tab === t.key
                ? 'bg-acai/20 text-acai shadow-sm'
                : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/60',
            )}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Section A: DRE */}
      {tab === 'dre' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <KpiCard
              title="Faturamento"
              value={finLoading ? '' : formatCurrency(fin?.revenue || 0)}
              icon={DollarSign}
              loading={finLoading}
              variant="teal"
            />
            <KpiCard
              title="CMV"
              value={finLoading ? '' : formatCurrency(fin?.cmv || 0)}
              subtitle={fin?.unmappedItems ? `${fin.unmappedItems} itens sem receita` : undefined}
              icon={TrendingDown}
              loading={finLoading}
              variant="red"
            />
            <KpiCard
              title="Lucro Bruto"
              value={finLoading ? '' : formatCurrency(fin?.grossProfit || 0)}
              icon={TrendingUp}
              loading={finLoading}
              variant="acai"
            />
            <KpiCard
              title="Margem Bruta"
              value={finLoading ? '' : `${fin?.marginPercent?.toFixed(1) || 0}%`}
              icon={Percent}
              loading={finLoading}
              variant="amber"
            />
          </div>

          {/* Margin Trend Chart */}
          <MarginTrendChart
            data={fin?.dailyTrend || []}
            loading={finLoading}
          />

          {/* Unmapped items warning */}
          {fin && fin.unmappedItems > 0 && (
            <div className="glass-card rounded-xl p-4 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 flex-shrink-0">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-400">
                    {fin.unmappedItems} itens sem mapeamento
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    Esses itens vendidos não possuem alias ou receita cadastrada. O CMV deles está sendo calculado como R$ 0,00. Configure em Fichas Técnicas.
                  </p>
                  {fin.unmappedNames && fin.unmappedNames.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-y-auto space-y-0.5">
                      {fin.unmappedNames.map((item: { name: string; count: number }) => (
                        <div key={item.name} className="flex items-center justify-between gap-2 group">
                          <p className="text-xs text-muted-foreground/50 font-mono truncate">
                            {item.count}x — {item.name}
                          </p>
                          <MapUnmappedAction pdvName={item.name} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section B: Margin per Product */}
      {tab === 'margins' && (
        <div className="space-y-6">
          {/* Top 10 by profit - horizontal bar chart */}
          <TopProfitChart data={fin?.productMargins || []} loading={finLoading} />

          {/* Product margins table */}
          <ProductMarginsTable data={fin?.productMargins || []} loading={finLoading} />
        </div>
      )}

      {/* Section C: Purchases */}
      {tab === 'purchases' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            <KpiCard
              title="Total em Compras"
              value={purchasesLoading ? '' : formatCurrency(purchases?.totalSpent || 0)}
              icon={ShoppingCart}
              loading={purchasesLoading}
              variant="teal"
            />
            <KpiCard
              title="Entradas Confirmadas"
              value={purchasesLoading ? '' : String(purchases?.entryCount || 0)}
              icon={Receipt}
              loading={purchasesLoading}
              variant="acai"
            />
            <KpiCard
              title="Gasto Médio / Entrada"
              value={purchasesLoading ? '' : formatCurrency(purchases?.avgPerEntry || 0)}
              icon={Calculator}
              loading={purchasesLoading}
              variant="amber"
            />
          </div>

          {/* Charts side by side */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PurchasesByCategoryChart
              data={purchases?.byCategory || []}
              loading={purchasesLoading}
            />
            <PurchasesTimelineChart
              data={purchases?.dailySpending || []}
              loading={purchasesLoading}
            />
          </div>

          {/* Product detail table */}
          <PurchaseDetailsTable data={purchases?.productDetails || []} loading={purchasesLoading} />
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy } from 'lucide-react';

const profitChartConfig = {
  value: { label: 'Lucro', color: '#ae2dac' },
} satisfies ChartConfig;

function TopProfitChart({ data, loading }: { data: { name: string; profit: number }[]; loading: boolean }) {
  const top10 = data
    .filter(d => d.profit > 0)
    .slice(0, 10)
    .map(d => ({
      name: d.name.length > 25 ? d.name.substring(0, 22) + '...' : d.name,
      value: d.profit,
      fullName: d.name,
    }));

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 pb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-acai/15">
          <Trophy className="h-3.5 w-3.5 text-acai" />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Top 10 por Lucro</h3>
          <p className="text-[10px] text-muted-foreground/60">Produtos com maior lucro bruto</p>
        </div>
      </div>
      <div className="px-5 pb-4">
        {loading ? (
          <Skeleton className="h-[300px] w-full shimmer rounded-lg" />
        ) : top10.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground/60">
            Sem dados de lucro por produto
          </div>
        ) : (
          <ChartContainer config={profitChartConfig} className="h-[300px] w-full">
            <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 10, bottom: 0, left: 120 }}>
              <XAxis
                type="number"
                fontSize={10}
                tickFormatter={(v) => `R$${v}`}
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

function MarginBadge({ margin }: { margin: number }) {
  const color = margin >= 60 ? 'bg-emerald-500/15 text-emerald-400' : margin >= 40 ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400';
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', color)}>
      {margin.toFixed(1)}%
    </span>
  );
}

function ProductMarginsTable({
  data,
  loading,
}: {
  data: {
    soldProductId: number;
    name: string;
    qtySold: number;
    revenue: number;
    cmv: number;
    profit: number;
    marginPercent: number;
    hasRecipe: boolean;
  }[];
  loading: boolean;
}) {
  const [sortKey, setSortKey] = useState<'revenue' | 'profit' | 'marginPercent' | 'qtySold'>('profit');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function handleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = [...data].sort((a, b) => {
    const mult = sortDir === 'desc' ? -1 : 1;
    return (a[sortKey] - b[sortKey]) * mult;
  });

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 pb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal/15">
          <ArrowUpDown className="h-3.5 w-3.5 text-teal" />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Margem por Produto</h3>
          <p className="text-[10px] text-muted-foreground/60">Clique no cabeçalho para ordenar</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-5">
            <Skeleton className="h-[300px] w-full shimmer rounded-lg" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground/60">
                <th className="px-5 py-2.5 font-medium">Produto</th>
                <ThSortable label="Qtd" sortKey="qtySold" current={sortKey} dir={sortDir} onSort={handleSort} />
                <ThSortable label="Receita" sortKey="revenue" current={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="px-3 py-2.5 font-medium text-right">CMV</th>
                <ThSortable label="Margem" sortKey="marginPercent" current={sortKey} dir={sortDir} onSort={handleSort} />
                <ThSortable label="Lucro" sortKey="profit" current={sortKey} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr key={i} className="border-b border-white/[0.03] hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-2.5 font-medium">
                    <span className="flex items-center gap-2">
                      {p.name}
                      {!p.hasRecipe && (
                        <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded">sem receita</span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{p.qtySold}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(p.revenue)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(p.cmv)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <MarginBadge margin={p.marginPercent} />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">{formatCurrency(p.profit)}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground/60">
                    Sem dados de produtos vendidos no período
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ThSortable({
  label,
  sortKey,
  current,
  dir,
  onSort,
}: {
  label: string;
  sortKey: string;
  current: string;
  dir: 'asc' | 'desc';
  onSort: (key: any) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      className="px-3 py-2.5 font-medium text-right cursor-pointer hover:text-foreground/80 select-none"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && <span className="text-acai">{dir === 'desc' ? '↓' : '↑'}</span>}
      </span>
    </th>
  );
}

function PurchaseDetailsTable({
  data,
  loading,
}: {
  data: {
    name: string;
    category: string;
    qtyPurchased: number;
    unit: string;
    totalSpent: number;
    costPerUnit: number;
  }[];
  loading: boolean;
}) {
  const categoryLabels: Record<string, string> = {
    insumo: 'Insumos',
    embalagem: 'Embalagens',
    complemento: 'Complementos',
    descartavel: 'Descartáveis',
    outros: 'Outros',
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 pb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-acai/15">
          <Receipt className="h-3.5 w-3.5 text-acai" />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Detalhamento de Compras</h3>
          <p className="text-[10px] text-muted-foreground/60">Produtos comprados no período</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-5">
            <Skeleton className="h-[200px] w-full shimmer rounded-lg" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground/60">
                <th className="px-5 py-2.5 font-medium">Produto</th>
                <th className="px-3 py-2.5 font-medium">Categoria</th>
                <th className="px-3 py-2.5 font-medium text-right">Qtd Comprada</th>
                <th className="px-3 py-2.5 font-medium text-right">Total Gasto</th>
                <th className="px-3 py-2.5 font-medium text-right">Custo Unit. Atual</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p, i) => (
                <tr key={i} className="border-b border-white/[0.03] hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-2.5 font-medium">{p.name}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-muted-foreground/80 bg-muted/60 px-2 py-0.5 rounded">
                      {categoryLabels[p.category] || p.category}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {p.qtyPurchased} {p.unit}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(p.totalSpent)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {p.costPerUnit > 0 ? formatCurrency(p.costPerUnit) : '—'}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground/60">
                    Sem compras confirmadas no período
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
