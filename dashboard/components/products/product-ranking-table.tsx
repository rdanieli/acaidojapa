'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
  name: string;
  qty: number;
  revenue: number;
  avgPrice: number;
  pdvQty: number;
  onlineQty: number;
}

interface ProductRankingTableProps {
  products: Product[];
  loading?: boolean;
}

type SortKey = 'name' | 'qty' | 'revenue' | 'avgPrice';

export function ProductRankingTable({ products, loading }: ProductRankingTableProps) {
  const [sortBy, setSortBy] = useState<SortKey>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full shimmer rounded-lg" />
        ))}
      </div>
    );
  }

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  }

  const sorted = [...products].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1;
    if (sortBy === 'name') return mul * a.name.localeCompare(b.name);
    return mul * (a[sortBy] - b[sortBy]);
  });

  if (products.length === 0) {
    return (
      <div className="glass-card rounded-xl py-12 text-center">
        <p className="text-sm text-muted-foreground/60">Nenhum produto encontrado.</p>
      </div>
    );
  }

  function SortHeader({ label, field }: { label: string; field: SortKey }) {
    const isActive = sortBy === field;
    return (
      <TableHead
        className="cursor-pointer select-none text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-150"
        onClick={() => toggleSort(field)}
      >
        <span className="flex items-center gap-1">
          {label}
          <ArrowUpDown className={cn('h-3 w-3', isActive && 'text-acai')} />
        </span>
      </TableHead>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-8 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">#</TableHead>
            <SortHeader label="Produto" field="name" />
            <SortHeader label="Qty" field="qty" />
            <SortHeader label="Faturamento" field="revenue" />
            <SortHeader label="Preço Médio" field="avgPrice" />
            <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">PDV</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Online</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((p, i) => (
            <TableRow key={p.name} className="border-border/60 transition-colors duration-150 hover:bg-muted/50">
              <TableCell className="text-xs font-medium text-muted-foreground/40">{i + 1}</TableCell>
              <TableCell className="text-sm font-medium">{p.name}</TableCell>
              <TableCell className="text-sm tabular-nums">{p.qty}</TableCell>
              <TableCell className="text-sm font-semibold tabular-nums">{formatCurrency(p.revenue)}</TableCell>
              <TableCell className="text-sm tabular-nums text-muted-foreground">{formatCurrency(p.avgPrice)}</TableCell>
              <TableCell className="text-xs text-muted-foreground/60 tabular-nums">{p.pdvQty}</TableCell>
              <TableCell className="text-xs text-muted-foreground/60 tabular-nums">{p.onlineQty}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
