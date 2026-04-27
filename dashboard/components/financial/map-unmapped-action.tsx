'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSoldProducts, useCreateAlias } from '@/hooks/use-dashboard';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Link2, Check } from 'lucide-react';

export function MapUnmappedAction({ pdvName }: { pdvName: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | ''>('');
  const { data: spData } = useSoldProducts();
  const createAlias = useCreateAlias();
  const qc = useQueryClient();

  const soldProducts = (spData?.soldProducts ?? []) as { id: number; name: string }[];
  const sorted = [...soldProducts].sort((a, b) => a.name.localeCompare(b.name));

  const handleSubmit = async () => {
    if (!selected) return;
    await createAlias.mutateAsync({ alias: pdvName, soldProductId: Number(selected) });
    qc.invalidateQueries({ queryKey: ['financial'] });
    setOpen(false);
    setSelected('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-acai/80 hover:text-acai hover:bg-acai/10 transition-colors cursor-pointer"
      >
        <Link2 className="h-3 w-3" />
        Mapear
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <p className="text-xs text-muted-foreground mb-1">Mapear este nome do PDV para um produto cadastrado:</p>
        <p className="text-[11px] font-mono text-foreground/80 mb-2 truncate">"{pdvName}"</p>

        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value === '' ? '' : Number(e.target.value))}
          className="h-8 w-full rounded-md bg-muted/50 border border-border px-2 text-xs"
        >
          <option value="">Selecione o produto…</option>
          {sorted.map((sp) => (
            <option key={sp.id} value={sp.id}>{sp.name}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selected || createAlias.isPending}
          className="mt-2 inline-flex items-center justify-center gap-1.5 w-full h-8 rounded-md bg-acai/20 text-acai text-xs font-medium hover:bg-acai/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Check className="h-3.5 w-3.5" />
          {createAlias.isPending ? 'Salvando…' : 'Salvar mapeamento'}
        </button>

        {createAlias.isError && (
          <p className="text-[11px] text-red-400 mt-1.5">Falha ao salvar. Talvez já exista um mapeamento.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
