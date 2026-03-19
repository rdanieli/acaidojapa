'use client';

import { useState } from 'react';
import { useStockMovements, useCreateMovement, useProductsCatalog } from '@/hooks/use-dashboard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Plus, ArrowDownCircle, ArrowUpCircle, RefreshCw, ClipboardCheck, Wrench } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  entrada: { label: 'Entrada', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: ArrowDownCircle },
  saida_venda: { label: 'Saída Venda', color: 'bg-red-500/15 text-red-400 border-red-500/20', icon: ArrowUpCircle },
  saida_manual: { label: 'Saída Manual', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20', icon: ArrowUpCircle },
  ajuste: { label: 'Ajuste', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20', icon: Wrench },
  consolidacao: { label: 'Inventário', color: 'bg-purple-500/15 text-purple-400 border-purple-500/20', icon: ClipboardCheck },
};

export function StockMovementsTable() {
  const [filterType, setFilterType] = useState('');
  const [filterProductId, setFilterProductId] = useState('');
  const { data, isLoading } = useStockMovements({
    type: filterType || undefined,
    productId: filterProductId ? Number(filterProductId) : undefined,
  });
  const { data: catalogData } = useProductsCatalog();
  const createMovement = useCreateMovement();

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ productId: '', type: 'entrada', quantity: '', unit: 'un', notes: '' });

  const movements = data?.movements ?? [];
  const catalogProducts = catalogData?.products ?? [];

  const handleAdd = () => {
    if (!addForm.productId || !addForm.quantity) return;
    createMovement.mutate({
      productId: Number(addForm.productId),
      type: addForm.type,
      quantity: Number(addForm.quantity),
      unit: addForm.unit,
      notes: addForm.notes || undefined,
    }, {
      onSuccess: () => {
        setShowAdd(false);
        setAddForm({ productId: '', type: 'entrada', quantity: '', unit: 'un', notes: '' });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full shimmer rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters + Add */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-9 rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 text-xs text-muted-foreground"
        >
          <option value="">Todos os tipos</option>
          {Object.entries(TYPE_CONFIG).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={filterProductId}
          onChange={(e) => setFilterProductId(e.target.value)}
          className="h-9 rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 text-xs text-muted-foreground"
        >
          <option value="">Todos os produtos</option>
          {catalogProducts.filter((p: any) => p.active).map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <Button
          onClick={() => setShowAdd(true)}
          size="sm"
          className="h-9 bg-acai hover:bg-acai/80 text-white text-xs ml-auto"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Nova Movimentação
        </Button>
      </div>

      {movements.length === 0 ? (
        <div className="glass-card rounded-xl py-10 text-center">
          <RefreshCw className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground/60">Nenhuma movimentação encontrada.</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Data</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Tipo</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Produto</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Qtd</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Notas</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m: any) => {
                const config = TYPE_CONFIG[m.type] || TYPE_CONFIG.ajuste;
                return (
                  <TableRow key={m.id} className="border-white/[0.04] hover:bg-white/[0.03]">
                    <TableCell className="text-xs text-muted-foreground/60">
                      {new Date(m.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-[10px]', config.color)}>
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{m.productName}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {m.type.startsWith('saida') ? '-' : '+'}{m.quantity} {m.unit}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground/50 max-w-32 truncate">{m.notes || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground/40">{m.createdBy || '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Movement Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-background border-white/[0.08]">
          <DialogHeader>
            <DialogTitle>Nova Movimentação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <select
              value={addForm.productId}
              onChange={(e) => setAddForm({ ...addForm, productId: e.target.value })}
              className="w-full h-9 rounded-md bg-white/[0.03] border border-white/[0.08] px-3 text-sm"
            >
              <option value="">Selecione o produto...</option>
              {catalogProducts.filter((p: any) => p.active).map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <select
                value={addForm.type}
                onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
                className="h-9 rounded-md bg-white/[0.03] border border-white/[0.08] px-3 text-sm flex-1"
              >
                <option value="entrada">Entrada</option>
                <option value="saida_manual">Saída Manual</option>
                <option value="ajuste">Ajuste</option>
              </select>
              <Input
                value={addForm.quantity}
                onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                placeholder="Qtd"
                type="number"
                className="h-9 w-24 bg-white/[0.03] border-white/[0.08]"
              />
              <select
                value={addForm.unit}
                onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                className="h-9 w-20 rounded-md bg-white/[0.03] border border-white/[0.08] px-2 text-sm"
              >
                {['un', 'kg', 'L', 'cx', 'pct', 'sc', 'g', 'ml'].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <Input
              value={addForm.notes}
              onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
              placeholder="Observações (opcional)"
              className="h-9 bg-white/[0.03] border-white/[0.08]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button
              onClick={handleAdd}
              disabled={!addForm.productId || !addForm.quantity || createMovement.isPending}
              className="bg-acai hover:bg-acai/80 text-white"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
