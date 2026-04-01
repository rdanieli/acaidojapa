'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format';
import type { UnifiedOrder } from '@/lib/types';

interface OrderDetailSheetProps {
  order: UnifiedOrder | null;
  open: boolean;
  onClose: () => void;
}

export function OrderDetailSheet({ order, open, onClose }: OrderDetailSheetProps) {
  if (!order) return null;

  const time = order.datetime.split('T')[1]?.substring(0, 5) || '--:--';
  const date = order.datetime.split('T')[0] || '';

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="overflow-y-auto bg-background/95 backdrop-blur-xl border-border">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold tracking-tight">
            Pedido #{order.displayId}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Data', value: date },
              { label: 'Hora', value: time },
              { label: 'Tipo', value: order.orderType },
              { label: 'Status', value: order.status === 'canceled' ? 'Cancelado' : 'Concluído' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-muted/50 border border-border p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">{label}</p>
                <p className="mt-0.5 text-sm font-semibold capitalize">{value}</p>
              </div>
            ))}
          </div>

          <Separator className="bg-muted/80" />

          <div>
            <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Itens</h4>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-muted/30 border border-border/60 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground/60">
                      {item.quantity}x {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(item.totalPrice)}</p>
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-muted/80" />

          <div>
            <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Pagamentos</h4>
            <div className="space-y-1.5">
              {order.payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm px-1">
                  <p className="text-muted-foreground/70">{p.method}</p>
                  <p className="font-medium">{formatCurrency(p.amount)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-acai/30 via-acai/10 to-transparent" />

          <div className="flex items-center justify-between rounded-xl gradient-acai p-4">
            <p className="text-sm font-semibold text-white/80">Total</p>
            <p className="text-xl font-bold text-white">{formatCurrency(order.total)}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
