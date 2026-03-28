'use client';

import { useState } from 'react';
import { useWasteEntries, useRecordWaste, useProductsCatalog } from '@/hooks/use-dashboard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Trash2, Plus, AlertTriangle, Calendar } from 'lucide-react';

const UNITS = ['un', 'kg', 'L', 'cx', 'pct', 'sc', 'g', 'ml'];

const REASONS = [
  { value: 'vencido', label: 'Vencido' },
  { value: 'estragado', label: 'Estragado' },
  { value: 'quebra', label: 'Quebra' },
  { value: 'preparo', label: 'Preparo' },
  { value: 'outro', label: 'Outro' },
];

const REASON_COLORS: Record<string, string> = {
  vencido: 'bg-red-500/15 text-red-500 border-red-500/20',
  estragado: 'bg-amber-500/15 text-amber-500 border-amber-500/20',
  quebra: 'bg-orange-500/15 text-orange-500 border-orange-500/20',
  preparo: 'bg-blue-500/15 text-blue-500 border-blue-500/20',
  outro: 'bg-gray-500/15 text-gray-500 border-gray-500/20',
};

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function DesperdiciosPage() {
  const { data, isLoading } = useWasteEntries();
  const { data: catalogData } = useProductsCatalog();
  const recordWaste = useRecordWaste();

  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('un');
  const [reason, setReason] = useState('vencido');
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');

  const entries = data?.entries ?? [];
  const activeProducts = (catalogData?.products ?? []).filter((p: any) => p.active);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !quantity || !date) return;

    recordWaste.mutate(
      {
        productId: Number(productId),
        quantity: Number(quantity),
        unit,
        reason,
        notes: notes || undefined,
        date,
      },
      {
        onSuccess: () => {
          setProductId('');
          setQuantity('');
          setUnit('un');
          setReason('vencido');
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
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15">
          <Trash2 className="h-4 w-4 text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Controle de Desperdicios</h2>
          <p className="text-xs text-muted-foreground/60">Registre perdas e acompanhe o historico</p>
        </div>
      </div>

      {/* Record waste form */}
      <form onSubmit={handleSubmit} className="glass-card rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Plus className="h-4 w-4 text-muted-foreground/60" />
          <h3 className="text-sm font-semibold">Registrar Desperdicio</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Product selector */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
              Produto
            </label>
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                // Auto-set unit from product
                const prod = activeProducts.find((p: any) => p.id === Number(e.target.value));
                if (prod?.defaultUnit) setUnit(prod.defaultUnit);
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            >
              <option value="">Selecione...</option>
              {activeProducts.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
              Quantidade
            </label>
            <Input
              type="number"
              step="any"
              min="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="bg-muted/70 border-border"
              required
            />
          </div>

          {/* Unit */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
              Unidade
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
              Motivo
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
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

          {/* Notes */}
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

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={recordWaste.isPending || !productId || !quantity}
            className="bg-acai hover:bg-acai/80 text-white text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Registrar
          </Button>
        </div>
      </form>

      {/* Waste history */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full shimmer rounded-xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-card rounded-xl py-10 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground/60">Nenhum desperdicio registrado.</p>
          <p className="text-xs text-muted-foreground/40 mt-1">
            Registre perdas para acompanhar e reduzir desperdicios.
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
                  Produto
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                  Quantidade
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                  Motivo
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                  Observacoes
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry: any) => (
                <TableRow key={entry.id} className="border-border/60 hover:bg-muted/50">
                  <TableCell className="text-xs text-muted-foreground/70 font-mono">
                    {entry.date}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{entry.productName || `#${entry.productId}`}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-semibold">
                      {Number(entry.quantity).toFixed(entry.unit === 'un' || entry.unit === 'cx' ? 0 : 2)}
                    </span>
                    <span className="text-xs text-muted-foreground/40 ml-1">{entry.unit}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-[10px]', REASON_COLORS[entry.reason] || REASON_COLORS.outro)}>
                      {REASONS.find((r) => r.value === entry.reason)?.label || entry.reason}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground/50 max-w-[200px] truncate">
                    {entry.notes || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
