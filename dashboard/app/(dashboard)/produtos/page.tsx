'use client';

import { useDashboard } from '../context';
import { useProducts } from '@/hooks/use-dashboard';
import { ProductRankingTable } from '@/components/products/product-ranking-table';
import { TopProductsChart } from '@/components/charts/top-products-chart';
import { BarChart3 } from 'lucide-react';

export default function ProdutosPage() {
  const { startDate, endDate, channel } = useDashboard();
  const { data, isLoading } = useProducts(startDate, endDate, channel);

  const products = data?.products ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal/15">
          <BarChart3 className="h-4 w-4 text-teal" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Produtos</h2>
          <p className="text-xs text-muted-foreground/60">Rankings e análise de vendas por produto</p>
        </div>
      </div>

      <TopProductsChart
        data={products.map((p) => ({ name: p.name, qty: p.qty, revenue: p.revenue }))}
        loading={isLoading}
      />

      <ProductRankingTable products={products} loading={isLoading} />
    </div>
  );
}
