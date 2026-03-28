'use client';

import { useState } from 'react';
import { useSoldProducts, useManualSales, useRecordManualSale } from '@/hooks/use-dashboard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingBag, Plus, X, Calendar } from 'lucide-react';
import { exportToCsv } from '@/lib/csv-export';
import { ExportButton } from '@/components/export-button';

const PAYMENT_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'credito', label: 'Credito' },
  { value: 'debito', label: 'Debito' },
];

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface SaleItem {
  soldProductId: string;
  name: string;
  quantity: string;
  unitPrice: string;
}

function emptyItem(): SaleItem {
  return { soldProductId: '', name: '', quantity: '1', unitPrice: '' };
}

export default function VendasPage() {
  const { data: soldData } = useSoldProducts();
  const { data: salesData, isLoading } = useManualSales();
  const recordSale = useRecordManualSale();

  const [date, setDate] = useState(todayISO());
  const [items, setItems] = useState<SaleItem[]>([emptyItem()]);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [notes, setNotes] = useState('');

  const activeSoldProducts = (soldData?.soldProducts ?? []).filter((p: any) => p.active);
  const sales = salesData?.sales ?? [];

  const handleExport = () => {
    const headers = ['Data', 'Total', 'Pagamento', 'Itens', 'Observações'];
    const rows = sales.map((sale: any) => {
      const saleItems = Array.isArray(sale.items) ? sale.items : [];
      const payLabel = PAYMENT_METHODS.find((m) => m.value === sale.paymentMethod)?.label || sale.paymentMethod || '';
      const itemsSummary = saleItems.map((i: any) => `${i.name || ''} x${i.quantity}`).join(', ');
      return [
        sale.date,
        Number(sale.total).toFixed(2).replace('.', ','),
        payLabel,
        itemsSummary,
        sale.notes || '',
      ];
    });
    exportToCsv('vendas.csv', headers, rows);
  };

  const updateItem = (index: number, field: keyof SaleItem, value: string) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleProductSelect = (index: number, soldProductId: string) => {
    const product = activeSoldProducts.find((p: any) => p.id === Number(soldProductId));
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        soldProductId,
        name: product?.name || '',
        unitPrice: product?.price ? String(Number(product.price)) : '',
      };
      return copy;
    });
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (index: number) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const itemTotal = (item: SaleItem) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return qty * price;
  };

  const grandTotal = items.reduce((sum, item) => sum + itemTotal(item), 0);

  const canSubmit = date && items.some((i) => i.soldProductId && Number(i.quantity) > 0 && Number(i.unitPrice) > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const validItems = items
      .filter((i) => i.soldProductId && Number(i.quantity) > 0 && Number(i.unitPrice) > 0)
      .map((i) => ({
        soldProductId: Number(i.soldProductId),
        name: i.name,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        totalPrice: itemTotal(i),
      }));

    recordSale.mutate(
      {
        date,
        items: validItems,
        paymentMethod: paymentMethod || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setItems([emptyItem()]);
          setNotes('');
          setDate(todayISO());
        },
      },
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-acai/15">
          <ShoppingBag className="h-4 w-4 text-acai" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Vendas</h2>
          <p className="text-xs text-muted-foreground/60">Registre vendas manualmente</p>
        </div>
        <div className="ml-auto">
          <ExportButton onClick={handleExport} />
        </div>
      </div>

      {/* New sale form */}
      <form onSubmit={handleSubmit} className="glass-card rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Plus className="h-4 w-4 text-muted-foreground/60" />
          <h3 className="text-sm font-semibold">Nova Venda</h3>
        </div>

        {/* Date */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
              Data
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-muted/70 border-border"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
              Pagamento
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
              Observacoes
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional..."
              className="bg-muted/70 border-border"
            />
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
            Itens
          </label>

          {items.map((item, index) => (
            <div key={index} className="grid gap-2 grid-cols-[1fr_80px_100px_90px_32px] items-end">
              {/* Product selector */}
              <div className="space-y-1">
                {index === 0 && (
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                    Produto
                  </span>
                )}
                <select
                  value={item.soldProductId}
                  onChange={(e) => handleProductSelect(index, e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Selecione...</option>
                  {activeSoldProducts.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.price ? ` - ${formatBRL(Number(p.price))}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                {index === 0 && (
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                    Qtd
                  </span>
                )}
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                  className="bg-muted/70 border-border"
                />
              </div>

              {/* Unit price */}
              <div className="space-y-1">
                {index === 0 && (
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                    Preco (R$)
                  </span>
                )}
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                  className="bg-muted/70 border-border"
                />
              </div>

              {/* Row total */}
              <div className="space-y-1">
                {index === 0 && (
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                    Total
                  </span>
                )}
                <div className="flex h-9 items-center px-2 text-sm font-mono font-semibold text-muted-foreground">
                  {formatBRL(itemTotal(item))}
                </div>
              </div>

              {/* Remove button */}
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-8 text-muted-foreground/50 hover:text-red-400"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground/60 hover:text-foreground"
            onClick={addItem}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar item
          </Button>
        </div>

        {/* Total + Submit */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <div className="text-sm font-semibold">
            Total: <span className="text-base font-bold text-acai">{formatBRL(grandTotal)}</span>
          </div>
          <Button
            type="submit"
            disabled={recordSale.isPending || !canSubmit}
            className="bg-acai hover:bg-acai/80 text-white text-xs"
          >
            <ShoppingBag className="h-3.5 w-3.5 mr-1" />
            Registrar Venda
          </Button>
        </div>
      </form>

      {/* Sales history */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full shimmer rounded-xl" />
          ))}
        </div>
      ) : sales.length === 0 ? (
        <div className="glass-card rounded-xl py-10 text-center">
          <ShoppingBag className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground/60">Nenhuma venda registrada.</p>
          <p className="text-xs text-muted-foreground/40 mt-1">
            Registre vendas para acompanhar seu faturamento.
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Data
                  </div>
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                  Itens
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                  Total (R$)
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                  Pagamento
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                  Observacoes
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale: any) => {
                const saleItems = Array.isArray(sale.items) ? sale.items : [];
                const payLabel = PAYMENT_METHODS.find((m) => m.value === sale.paymentMethod)?.label || sale.paymentMethod || '-';
                return (
                  <TableRow key={sale.id} className="border-border/60 hover:bg-muted/50">
                    <TableCell className="text-xs text-muted-foreground/70 font-mono">
                      {sale.date}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{saleItems.length}</span>
                      <span className="text-xs text-muted-foreground/40 ml-1">
                        {saleItems.length === 1 ? 'item' : 'itens'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm font-semibold text-acai">
                        {formatBRL(Number(sale.total))}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground/70">
                      {payLabel}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground/50 max-w-[200px] truncate">
                      {sale.notes || '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
