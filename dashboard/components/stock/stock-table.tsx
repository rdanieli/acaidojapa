'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

interface StockItem {
  codVenda?: string;
  descricao?: string;
  nomeProduto?: string;
  quantidade?: number;
  qtdEstoque?: number;
  unidade?: string;
}

interface StockTableProps {
  items: StockItem[];
  loading?: boolean;
}

export function StockTable({ items, loading }: StockTableProps) {
  const [search, setSearch] = useState('');

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full shimmer rounded-lg" />
        ))}
      </div>
    );
  }

  const filtered = items.filter((item) => {
    const name = (item.descricao || item.nomeProduto || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
        <Input
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 bg-white/[0.03] border-white/[0.08] focus:border-acai/40 focus:ring-acai/20 transition-all duration-200 placeholder:text-muted-foreground/40"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl py-12 text-center">
          <p className="text-sm text-muted-foreground/60">Nenhum item encontrado.</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="w-20 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Código</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Produto</TableHead>
                <TableHead className="w-24 text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Estoque</TableHead>
                <TableHead className="w-20 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Unidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item, i) => {
                const qty = item.quantidade ?? item.qtdEstoque ?? 0;
                const isLow = qty <= 0;
                return (
                  <TableRow key={item.codVenda || i} className="border-white/[0.04] transition-colors duration-150 hover:bg-white/[0.03]">
                    <TableCell className="font-mono text-xs text-muted-foreground/60">{item.codVenda || '-'}</TableCell>
                    <TableCell className="text-sm font-medium">{item.descricao || item.nomeProduto || '-'}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-semibold text-sm tabular-nums',
                        isLow ? 'text-destructive' : 'text-emerald-400',
                      )}
                    >
                      {qty}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground/50">{item.unidade || '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground/40">{filtered.length} de {items.length} produtos</p>
    </div>
  );
}
