'use client';

import { useState } from 'react';
import { useProductsCatalog, useUpdateProduct, useAddProduct, useDeleteProduct, useMergeProducts } from '@/hooks/use-dashboard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Pencil, Check, X, Search, ShoppingBasket, Merge } from 'lucide-react';

const CATEGORIES = [
  { value: '', label: 'Sem categoria' },
  { value: 'insumo', label: 'Insumo' },
  { value: 'embalagem', label: 'Embalagem' },
  { value: 'complemento', label: 'Complemento' },
  { value: 'descartavel', label: 'Descartável' },
];

const UNITS = ['un', 'kg', 'L', 'cx', 'pct', 'sc', 'g', 'ml'];

function stockColor(current: number, min: number | null) {
  if (current <= 0) return 'text-red-400';
  if (min != null && current <= min) return 'text-amber-400';
  return 'text-emerald-400';
}

function stockBg(current: number, min: number | null) {
  if (current <= 0) return 'bg-red-500/15 border-red-500/20';
  if (min != null && current <= min) return 'bg-amber-500/15 border-amber-500/20';
  return 'bg-emerald-500/15 border-emerald-500/20';
}

export function ProductsCatalog() {
  const { data, isLoading } = useProductsCatalog();
  const updateProduct = useUpdateProduct();
  const addProduct = useAddProduct();
  const deleteProduct = useDeleteProduct();
  const mergeProducts = useMergeProducts();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', aliases: '', defaultUnit: '', category: '',
    unitWeightG: '', minStock: '', costPerUnit: '',
  });
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('un');
  const [mergeSource, setMergeSource] = useState<any>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');

  const products = data?.products ?? [];
  const filtered = products.filter((p: any) => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.aliases || '').toLowerCase().includes(q);
  });

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setEditForm({
      name: p.name,
      aliases: p.aliases || '',
      defaultUnit: p.defaultUnit,
      category: p.category || '',
      unitWeightG: p.unitWeightG || '',
      minStock: p.minStock || '',
      costPerUnit: p.costPerUnit || '',
    });
  };

  const saveEdit = () => {
    if (!editingId || !editForm.name.trim()) return;
    updateProduct.mutate({
      id: editingId,
      name: editForm.name,
      aliases: editForm.aliases,
      defaultUnit: editForm.defaultUnit,
      category: editForm.category || null,
      unitWeightG: editForm.unitWeightG ? Number(editForm.unitWeightG) : null,
      minStock: editForm.minStock ? Number(editForm.minStock) : null,
      costPerUnit: editForm.costPerUnit ? Number(editForm.costPerUnit) : null,
    });
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    addProduct.mutate({ name: newName.trim(), defaultUnit: newUnit });
    setNewName('');
    setNewUnit('un');
  };

  const handleMerge = () => {
    if (!mergeSource || !mergeTargetId) return;
    mergeProducts.mutate({ sourceId: mergeSource.id, targetId: Number(mergeTargetId) });
    setMergeSource(null);
    setMergeTargetId('');
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
      {/* Add product + search */}
      <div className="flex gap-3">
        <div className="glass-card rounded-xl p-3 flex gap-2 items-center flex-1">
          <Input
            placeholder="Novo produto..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="h-8 bg-transparent border-border focus:border-acai/40 focus:ring-acai/20 placeholder:text-muted-foreground/40 text-sm"
          />
          <select
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            className="h-8 rounded-md bg-muted/50 border border-border px-2 text-xs text-muted-foreground"
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <Button
            onClick={handleAdd}
            disabled={!newName.trim() || addProduct.isPending}
            size="sm"
            className="h-8 bg-acai hover:bg-acai/80 text-white text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        </div>
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-full bg-muted/50 border-border focus:border-acai/40 focus:ring-acai/20 placeholder:text-muted-foreground/40 text-sm"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl py-10 text-center">
          <ShoppingBasket className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground/60">
            {products.length === 0 ? 'Nenhum produto cadastrado.' : 'Nenhum produto encontrado.'}
          </p>
          <p className="text-xs text-muted-foreground/40 mt-1">
            Produtos são criados automaticamente quando entradas de estoque são registradas via WhatsApp.
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-12 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">ID</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Produto</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Categoria</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Estoque</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Custo</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Peso/Un</TableHead>
                <TableHead className="w-20 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Un.</TableHead>
                <TableHead className="w-20 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Status</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p: any) => {
                const isEditing = editingId === p.id;
                const stock = Number(p.currentStock) || 0;
                const min = p.minStock ? Number(p.minStock) : null;
                return (
                  <TableRow key={p.id} className="border-border/60 hover:bg-muted/50">
                    <TableCell className="font-mono text-xs text-muted-foreground/40">{p.id}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="space-y-1">
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="h-7 text-sm bg-muted/70 border-acai/30"
                            autoFocus
                          />
                          <Input
                            value={editForm.aliases}
                            onChange={(e) => setEditForm({ ...editForm, aliases: e.target.value })}
                            placeholder="aliases..."
                            className="h-6 text-[11px] bg-muted/70 border-acai/30 placeholder:text-muted-foreground/30"
                          />
                        </div>
                      ) : (
                        <div>
                          <span className="text-sm font-medium">{p.name}</span>
                          {p.aliases && <p className="text-[11px] text-muted-foreground/40 truncate max-w-48">{p.aliases}</p>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          className="h-7 rounded-md bg-muted/70 border border-acai/30 px-1.5 text-xs"
                        >
                          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">
                          {CATEGORIES.find((c) => c.value === p.category)?.label || '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editForm.minStock}
                          onChange={(e) => setEditForm({ ...editForm, minStock: e.target.value })}
                          placeholder="mín..."
                          className="h-7 w-20 text-xs bg-muted/70 border-acai/30"
                        />
                      ) : (
                        <Badge className={cn('text-[10px] font-mono', stockBg(stock, min))}>
                          <span className={stockColor(stock, min)}>
                            {stock} {p.defaultUnit}
                          </span>
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editForm.costPerUnit}
                          onChange={(e) => setEditForm({ ...editForm, costPerUnit: e.target.value })}
                          placeholder="R$"
                          className="h-7 w-20 text-xs bg-muted/70 border-acai/30"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground/50">
                          {p.costPerUnit ? `R$ ${Number(p.costPerUnit).toFixed(2)}` : '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editForm.unitWeightG}
                          onChange={(e) => setEditForm({ ...editForm, unitWeightG: e.target.value })}
                          placeholder="g"
                          className="h-7 w-20 text-xs bg-muted/70 border-acai/30"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground/50">
                          {p.unitWeightG ? `${p.unitWeightG}g` : '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <select
                          value={editForm.defaultUnit}
                          onChange={(e) => setEditForm({ ...editForm, defaultUnit: e.target.value })}
                          className="h-7 rounded-md bg-muted/70 border border-acai/30 px-1.5 text-xs"
                        >
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">{p.defaultUnit}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          'text-[10px] cursor-pointer',
                          p.active
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                            : 'bg-muted-foreground/15 text-muted-foreground border-muted-foreground/20'
                        )}
                        onClick={() => updateProduct.mutate({ id: p.id, active: !p.active })}
                      >
                        {p.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <button onClick={saveEdit} className="p-1 rounded-md hover:bg-emerald-500/15 text-emerald-400 transition-colors">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1 rounded-md hover:bg-destructive/15 text-muted-foreground/40 hover:text-destructive transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(p)} className="p-1 rounded-md hover:bg-muted/80 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => { setMergeSource(p); setMergeTargetId(''); }} className="p-1 rounded-md hover:bg-acai/15 text-muted-foreground/40 hover:text-acai transition-colors">
                              <Merge className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => deleteProduct.mutate(p.id)} className="p-1 rounded-md hover:bg-destructive/15 text-muted-foreground/40 hover:text-destructive transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground/40">{filtered.length} de {products.length} produtos</p>

      {/* Merge Dialog */}
      <Dialog open={!!mergeSource} onOpenChange={(open) => !open && setMergeSource(null)}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle>Merge de Produtos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Mover todos os itens de <strong>{mergeSource?.name}</strong> para outro produto e desativá-lo.
            </p>
            <select
              value={mergeTargetId}
              onChange={(e) => setMergeTargetId(e.target.value)}
              className="w-full h-9 rounded-md bg-muted/50 border border-border px-3 text-sm"
            >
              <option value="">Selecione o produto destino...</option>
              {products
                .filter((p: any) => p.id !== mergeSource?.id && p.active)
                .map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMergeSource(null)}>Cancelar</Button>
            <Button
              onClick={handleMerge}
              disabled={!mergeTargetId || mergeProducts.isPending}
              className="bg-acai hover:bg-acai/80 text-white"
            >
              Confirmar Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
