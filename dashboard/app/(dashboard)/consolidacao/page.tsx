'use client';

import { useState } from 'react';
import { useConsolidations, useConsolidation, useStartConsolidation, useUpdateConsolidation, useFinalizeConsolidation } from '@/hooks/use-dashboard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ClipboardCheck, Plus, ArrowLeft, Check } from 'lucide-react';

export default function ConsolidacaoPage() {
  const { data: listData, isLoading } = useConsolidations();
  const startConsolidation = useStartConsolidation();
  const finalizeConsolidation = useFinalizeConsolidation();
  const updateConsolidation = useUpdateConsolidation();

  const [viewId, setViewId] = useState<number | null>(null);
  const { data: detailData } = useConsolidation(viewId);

  const [editedItems, setEditedItems] = useState<Record<number, { actualStock: string; notes: string }>>({});

  const consolidations = listData?.consolidations ?? [];
  const items = detailData?.items ?? [];
  const consolidation = detailData?.consolidation;

  const handleStart = () => {
    startConsolidation.mutate({}, {
      onSuccess: (data: any) => {
        setViewId(data.consolidation.id);
      },
    });
  };

  const getEdited = (item: any) => {
    return editedItems[item.id] || { actualStock: item.actualStock ?? '', notes: item.notes ?? '' };
  };

  const setEdited = (itemId: number, field: string, value: string) => {
    const current = editedItems[itemId] || {};
    setEditedItems({ ...editedItems, [itemId]: { ...current, actualStock: current.actualStock ?? '', notes: current.notes ?? '', [field]: value } });
  };

  const handleSave = () => {
    if (!viewId) return;
    const updates = Object.entries(editedItems).map(([id, vals]) => ({
      id: Number(id),
      actualStock: Number(vals.actualStock) || 0,
      notes: vals.notes || undefined,
    }));
    updateConsolidation.mutate({ id: viewId, items: updates });
  };

  const handleFinalize = () => {
    if (!viewId) return;
    // First save, then finalize
    handleSave();
    finalizeConsolidation.mutate(viewId, {
      onSuccess: () => setViewId(null),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full shimmer rounded-xl" />
        ))}
      </div>
    );
  }

  // Detail view
  if (viewId && consolidation) {
    const isFinalized = consolidation.status === 'finalized';

    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => { setViewId(null); setEditedItems({}); }} className="p-2 rounded-xl hover:bg-white/[0.06] text-muted-foreground/60">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Inventário #{viewId}</h2>
            <p className="text-xs text-muted-foreground/60">
              {consolidation.date} — {isFinalized ? 'Finalizado' : 'Em andamento'}
            </p>
          </div>
          {!isFinalized && (
            <div className="ml-auto flex gap-2">
              <Button onClick={handleSave} variant="ghost" size="sm" disabled={updateConsolidation.isPending} className="text-xs">
                Salvar
              </Button>
              <Button onClick={handleFinalize} size="sm" disabled={finalizeConsolidation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                <Check className="h-3.5 w-3.5 mr-1" />
                Finalizar
              </Button>
            </div>
          )}
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Produto</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50 w-28">Teórico</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50 w-28">Real</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50 w-28">Diferença</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => {
                const edited = getEdited(item);
                const expected = Number(item.expectedStock) || 0;
                const actual = edited.actualStock !== '' ? Number(edited.actualStock) : null;
                const diff = actual != null ? actual - expected : null;
                const diffPct = expected > 0 && diff != null ? Math.abs(diff / expected) * 100 : 0;

                return (
                  <TableRow key={item.id} className="border-white/[0.04] hover:bg-white/[0.03]">
                    <TableCell>
                      <span className="text-sm font-medium">{item.productName}</span>
                      <span className="text-xs text-muted-foreground/40 ml-1">({item.defaultUnit})</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground/60">
                      {expected}
                    </TableCell>
                    <TableCell>
                      {isFinalized ? (
                        <span className="font-mono text-xs">{item.actualStock ?? '-'}</span>
                      ) : (
                        <Input
                          value={edited.actualStock}
                          onChange={(e) => setEdited(item.id, 'actualStock', e.target.value)}
                          type="number"
                          className="h-7 w-24 text-xs bg-white/[0.05] border-white/[0.08]"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {diff != null ? (
                        <span className={cn(
                          'font-mono text-xs font-semibold',
                          diff === 0 ? 'text-emerald-400' : diffPct > 10 ? 'text-red-400' : 'text-amber-400'
                        )}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/30">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isFinalized ? (
                        <span className="text-xs text-muted-foreground/50">{item.notes || '-'}</span>
                      ) : (
                        <Input
                          value={edited.notes}
                          onChange={(e) => setEdited(item.id, 'notes', e.target.value)}
                          placeholder="..."
                          className="h-7 text-xs bg-white/[0.05] border-white/[0.08]"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15">
          <ClipboardCheck className="h-4 w-4 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Inventário</h2>
          <p className="text-xs text-muted-foreground/60">Consolidação e contagem de estoque</p>
        </div>
        <Button
          onClick={handleStart}
          disabled={startConsolidation.isPending}
          size="sm"
          className="ml-auto bg-acai hover:bg-acai/80 text-white text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Iniciar Inventário
        </Button>
      </div>

      {consolidations.length === 0 ? (
        <div className="glass-card rounded-xl py-10 text-center">
          <ClipboardCheck className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground/60">Nenhum inventário realizado.</p>
          <p className="text-xs text-muted-foreground/40 mt-1">Inicie um inventário para comparar estoque teórico com o real.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {consolidations.map((c: any) => (
            <div
              key={c.id}
              onClick={() => setViewId(c.id)}
              className="glass-card rounded-xl p-4 cursor-pointer hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Inventário #{c.id}</h3>
                <Badge className={cn(
                  'text-[10px]',
                  c.status === 'finalized'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                )}>
                  {c.status === 'finalized' ? 'Finalizado' : 'Em andamento'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground/50 mt-1">{c.date}</p>
              {c.notes && <p className="text-xs text-muted-foreground/40 mt-1">{c.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
