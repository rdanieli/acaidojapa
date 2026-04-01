'use client';

import { useState } from 'react';
import { useDashboard } from '../context';
import { useOrders } from '@/hooks/use-dashboard';
import { OrdersTable } from '@/components/orders/orders-table';
import { OrderDetailSheet } from '@/components/orders/order-detail-sheet';
import { ShoppingBag } from 'lucide-react';
import type { UnifiedOrder } from '@/lib/types';

export default function PedidosPage() {
  const { startDate, endDate } = useDashboard();
  const { data, isLoading } = useOrders(startDate, endDate);
  const [selected, setSelected] = useState<UnifiedOrder | null>(null);

  const orders = data?.orders ?? [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-acai/15">
            <ShoppingBag className="h-4 w-4 text-acai" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Pedidos</h2>
            <p className="text-xs text-muted-foreground/60">Histórico detalhado de pedidos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-muted/60 border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            {orders.length} pedidos
          </span>
        </div>
      </div>

      <OrdersTable orders={orders} loading={isLoading} onSelect={setSelected} />

      <OrderDetailSheet
        order={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
