'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import type { UnifiedOrder } from '@/lib/types';

interface OrdersTableProps {
  orders: UnifiedOrder[];
  loading?: boolean;
  onSelect: (order: UnifiedOrder) => void;
}

function statusBadge(status: 'completed' | 'canceled') {
  return status === 'canceled' ? (
    <Badge variant="destructive" className="text-[10px] font-medium">Cancelado</Badge>
  ) : (
    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px] font-medium">OK</Badge>
  );
}

function formatTime(datetime: string) {
  const timePart = datetime.split('T')[1];
  return timePart?.substring(0, 5) || '--:--';
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  balcao: 'Balcão',
  delivery: 'Delivery',
  takeout: 'Retirada',
  onsite: 'No local',
};

export function OrdersTable({ orders, loading, onSelect }: OrdersTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full shimmer rounded-lg" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="glass-card rounded-xl py-12 text-center">
        <p className="text-sm text-muted-foreground/60">Nenhum pedido encontrado.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-16 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">#</TableHead>
            <TableHead className="w-16 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Hora</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Tipo</TableHead>
            <TableHead className="text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Total</TableHead>
            <TableHead className="w-20 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Status</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Pagamento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={order.id}
              className="cursor-pointer border-border/60 transition-colors duration-150 hover:bg-muted/50"
              onClick={() => onSelect(order)}
            >
              <TableCell className="font-mono text-xs text-muted-foreground">{order.displayId}</TableCell>
              <TableCell className="text-xs font-medium">{formatTime(order.datetime)}</TableCell>
              <TableCell className="text-xs text-foreground/80">{ORDER_TYPE_LABELS[order.orderType] || order.orderType}</TableCell>
              <TableCell className="text-right font-semibold text-xs">{formatCurrency(order.total)}</TableCell>
              <TableCell>{statusBadge(order.status)}</TableCell>
              <TableCell className="text-xs text-muted-foreground/60">
                {order.payments.map((p) => p.method).join(', ') || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
