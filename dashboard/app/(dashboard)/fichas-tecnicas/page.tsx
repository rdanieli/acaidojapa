'use client';

import { useState } from 'react';
import { useSoldProducts, useAddSoldProduct, useUpdateSoldProduct, useDeleteSoldProduct, useRecipe, useSaveRecipe, useProductsCatalog } from '@/hooks/use-dashboard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Plus, ClipboardList, Trash2, Pencil, X, Check } from 'lucide-react';
import { ingredientCostForGrams } from '@/lib/stock/ingredient-cost';

interface RecipeItem {
  productId: number;
  quantityG: number;
  isBase: boolean;
  notes: string;
}

export default function FichasTecnicasPage() {
  const { data: spData, isLoading } = useSoldProducts();
  const { data: catalogData } = useProductsCatalog();
  const addSoldProduct = useAddSoldProduct();
  const updateSoldProduct = useUpdateSoldProduct();
  const deleteSoldProduct = useDeleteSoldProduct();
  const saveRecipe = useSaveRecipe();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: recipeData } = useRecipe(selectedId);

  const [newForm, setNewForm] = useState({ name: '', sizeMl: '', category: 'acai', price: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', sizeMl: '', category: '', price: '' });
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [recipeLoaded, setRecipeLoaded] = useState(false);

  const soldProducts = spData?.soldProducts ?? [];
  const catalogProducts = catalogData?.products?.filter((p: any) => p.active) ?? [];

  const openRecipe = (sp: any) => {
    setSelectedId(sp.id);
    setRecipeLoaded(false);
  };

  // Load recipe items when data arrives
  if (recipeData?.recipe && selectedId && !recipeLoaded) {
    setRecipeItems(recipeData.recipe.map((r: any) => ({
      productId: r.productId,
      quantityG: Number(r.quantityG),
      isBase: r.isBase,
      notes: r.notes || '',
    })));
    setRecipeLoaded(true);
  }

  const addRecipeItem = () => {
    setRecipeItems([...recipeItems, { productId: 0, quantityG: 0, isBase: false, notes: '' }]);
  };

  const updateRecipeItem = (index: number, field: string, value: any) => {
    const items = [...recipeItems];
    (items[index] as any)[field] = value;
    setRecipeItems(items);
  };

  const removeRecipeItem = (index: number) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== index));
  };

  const handleSaveRecipe = () => {
    if (!selectedId) return;
    saveRecipe.mutate({
      soldProductId: selectedId,
      items: recipeItems.filter((i) => i.productId > 0 && i.quantityG > 0),
    });
  };

  const handleAddProduct = () => {
    if (!newForm.name.trim()) return;
    addSoldProduct.mutate({
      name: newForm.name.trim(),
      sizeMl: newForm.sizeMl ? Number(newForm.sizeMl) : undefined,
      category: newForm.category || undefined,
      price: newForm.price ? Number(newForm.price) : undefined,
    });
    setNewForm({ name: '', sizeMl: '', category: 'acai', price: '' });
  };

  // Calculate recipe cost — uses shared helper so this matches the Financeiro CMV exactly.
  const calcCost = () => {
    let total = 0;
    for (const item of recipeItems) {
      const product = catalogProducts.find((p: any) => p.id === item.productId);
      if (!product || !product.costPerUnit) continue;
      total += ingredientCostForGrams(
        Number(product.costPerUnit),
        product.defaultUnit || 'g',
        product.unitWeightG ? Number(product.unitWeightG) : null,
        item.quantityG,
      );
    }
    return total;
  };

  const selectedProduct = soldProducts.find((sp: any) => sp.id === selectedId);
  const recipeCost = calcCost();
  const price = selectedProduct?.price ? Number(selectedProduct.price) : 0;
  const cmv = price > 0 ? (recipeCost / price) * 100 : 0;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full shimmer rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-acai/15">
          <ClipboardList className="h-4 w-4 text-acai" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Fichas Técnicas</h2>
          <p className="text-xs text-muted-foreground/60">Receitas e composição dos produtos vendidos</p>
        </div>
      </div>

      {/* Add sold product */}
      <div className="glass-card rounded-xl p-3 flex gap-2 items-center flex-wrap">
        <Input
          placeholder="Nome do produto..."
          value={newForm.name}
          onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
          className="h-8 flex-1 min-w-40 bg-transparent border-border focus:border-acai/40 text-sm"
        />
        <Input
          placeholder="ml"
          value={newForm.sizeMl}
          onChange={(e) => setNewForm({ ...newForm, sizeMl: e.target.value })}
          className="h-8 w-20 bg-transparent border-border text-sm"
          type="number"
        />
        <select
          value={newForm.category}
          onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}
          className="h-8 rounded-md bg-muted/50 border border-border px-2 text-xs text-muted-foreground"
        >
          <option value="acai">Açaí</option>
          <option value="suco">Suco</option>
          <option value="sorvete">Sorvete</option>
          <option value="outros">Outros</option>
        </select>
        <Input
          placeholder="Preço R$"
          value={newForm.price}
          onChange={(e) => setNewForm({ ...newForm, price: e.target.value })}
          className="h-8 w-24 bg-transparent border-border text-sm"
          type="number"
        />
        <Button
          onClick={handleAddProduct}
          disabled={!newForm.name.trim() || addSoldProduct.isPending}
          size="sm"
          className="h-8 bg-acai hover:bg-acai/80 text-white text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar
        </Button>
      </div>

      {/* Product cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {soldProducts.map((sp: any) => {
          const isEditingSp = editingId === sp.id;
          return (
            <div
              key={sp.id}
              className={cn(
                'glass-card rounded-xl p-4 cursor-pointer transition-all hover:bg-muted/60',
                !sp.active && 'opacity-50'
              )}
              onClick={() => !isEditingSp && openRecipe(sp)}
            >
              {isEditingSp ? (
                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                  <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-7 text-sm bg-muted/70 border-acai/30" />
                  <div className="flex gap-2">
                    <Input value={editForm.sizeMl} onChange={(e) => setEditForm({ ...editForm, sizeMl: e.target.value })} placeholder="ml" className="h-7 w-20 text-xs bg-muted/70 border-acai/30" />
                    <Input value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} placeholder="R$" className="h-7 w-20 text-xs bg-muted/70 border-acai/30" />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => {
                      updateSoldProduct.mutate({
                        id: sp.id,
                        name: editForm.name,
                        sizeMl: editForm.sizeMl ? Number(editForm.sizeMl) : undefined,
                        price: editForm.price ? Number(editForm.price) : undefined,
                        category: editForm.category || undefined,
                      });
                      setEditingId(null);
                    }} className="p-1 rounded-md hover:bg-emerald-500/15 text-emerald-400">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 rounded-md hover:bg-destructive/15 text-muted-foreground/40">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{sp.name}</h3>
                      <div className="flex gap-2 mt-1">
                        {sp.sizeMl && <Badge className="text-[10px] bg-acai/15 text-acai border-acai/20">{sp.sizeMl}ml</Badge>}
                        {sp.category && <Badge className="text-[10px] bg-muted/80 text-muted-foreground/60 border-border">{sp.category}</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => {
                        setEditingId(sp.id);
                        setEditForm({ name: sp.name, sizeMl: sp.sizeMl?.toString() || '', category: sp.category || '', price: sp.price || '' });
                      }} className="p-1 rounded-md hover:bg-muted/80 text-muted-foreground/40">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={() => deleteSoldProduct.mutate(sp.id)} className="p-1 rounded-md hover:bg-destructive/15 text-muted-foreground/40 hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    {sp.price && <span className="text-lg font-bold text-acai">R$ {Number(sp.price).toFixed(2)}</span>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {soldProducts.length === 0 && (
        <div className="glass-card rounded-xl py-10 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground/60">Nenhum produto cadastrado.</p>
          <p className="text-xs text-muted-foreground/40 mt-1">Adicione os produtos vendidos para criar fichas técnicas.</p>
        </div>
      )}

      {/* Recipe Sheet */}
      <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-lg bg-background border-border overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedProduct?.name || 'Receita'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            {/* Cost summary */}
            <div className="flex gap-3">
              <div className="glass-card rounded-lg p-3 flex-1 text-center">
                <p className="text-[10px] uppercase text-muted-foreground/50">Custo</p>
                <p className="text-lg font-bold text-amber-400">R$ {recipeCost.toFixed(2)}</p>
              </div>
              <div className="glass-card rounded-lg p-3 flex-1 text-center">
                <p className="text-[10px] uppercase text-muted-foreground/50">CMV</p>
                <p className={cn('text-lg font-bold', cmv > 35 ? 'text-red-400' : cmv > 25 ? 'text-amber-400' : 'text-emerald-400')}>
                  {price > 0 ? `${cmv.toFixed(1)}%` : '-'}
                </p>
              </div>
            </div>

            {/* Recipe items */}
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-[10px] uppercase text-muted-foreground/50">Insumo</TableHead>
                  <TableHead className="text-[10px] uppercase text-muted-foreground/50 w-24">Qtd (g)</TableHead>
                  <TableHead className="text-[10px] uppercase text-muted-foreground/50 w-16">Base</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipeItems.map((item, idx) => (
                  <TableRow key={idx} className="border-border/60">
                    <TableCell>
                      <select
                        value={item.productId}
                        onChange={(e) => updateRecipeItem(idx, 'productId', Number(e.target.value))}
                        className="w-full h-8 rounded-md bg-muted/50 border border-border px-2 text-xs"
                      >
                        <option value={0}>Selecione...</option>
                        {catalogProducts.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.quantityG || ''}
                        onChange={(e) => updateRecipeItem(idx, 'quantityG', Number(e.target.value) || 0)}
                        type="number"
                        className="h-8 text-xs bg-muted/50 border-border"
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={item.isBase}
                        onChange={(e) => updateRecipeItem(idx, 'isBase', e.target.checked)}
                        className="accent-acai"
                      />
                    </TableCell>
                    <TableCell>
                      <button onClick={() => removeRecipeItem(idx)} className="p-1 rounded-md hover:bg-destructive/15 text-muted-foreground/40 hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex gap-2">
              <Button onClick={addRecipeItem} variant="ghost" size="sm" className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar Insumo
              </Button>
              <Button
                onClick={handleSaveRecipe}
                disabled={saveRecipe.isPending}
                size="sm"
                className="ml-auto bg-acai hover:bg-acai/80 text-white text-xs"
              >
                Salvar Receita
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
