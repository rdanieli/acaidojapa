'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, MessageSquare, Camera, Mic } from 'lucide-react';

interface InventoryItem {
  id: number;
  productName: string;
  quantity: string;
  unit: string;
  unitPrice: string | null;
  totalPrice: string | null;
}

interface InventoryEntry {
  id: number;
  source: string;
  rawText: string | null;
  senderPhone: string;
  status: string;
  createdAt: string;
  confirmedAt: string | null;
  items: InventoryItem[];
}

interface InventoryEntriesTableProps {
  entries: InventoryEntry[];
  loading?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: {
    label: 'Pendente',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  },
  confirmed: {
    label: 'Confirmado',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  },
  rejected: {
    label: 'Cancelado',
    className: 'bg-destructive/15 text-destructive border-destructive/20',
  },
  expired: {
    label: 'Expirado',
    className: 'bg-muted-foreground/15 text-muted-foreground border-muted-foreground/20',
  },
};

const SOURCE_ICON = {
  image: Camera,
  audio: Mic,
  text: MessageSquare,
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function InventoryEntriesTable({ entries, loading }: InventoryEntriesTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full shimmer rounded-lg" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="glass-card rounded-xl py-12 text-center">
        <p className="text-sm text-muted-foreground/60">Nenhuma entrada encontrada.</p>
        <p className="text-xs text-muted-foreground/40 mt-1">
          Envie uma foto ou áudio pelo WhatsApp para registrar entradas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="w-8" />
              <TableHead className="w-16 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                #
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                Data
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                Origem
              </TableHead>
              <TableHead className="w-20 text-center text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                Itens
              </TableHead>
              <TableHead className="text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                Total
              </TableHead>
              <TableHead className="w-28 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const SourceIcon = SOURCE_ICON[entry.source as keyof typeof SOURCE_ICON] || MessageSquare;
              const statusConfig = STATUS_CONFIG[entry.status] || STATUS_CONFIG.pending;
              const total = entry.items.reduce(
                (sum, item) => sum + (item.totalPrice ? parseFloat(item.totalPrice) : 0),
                0
              );

              return (
                <TableRow
                  key={entry.id}
                  className={cn(
                    'border-white/[0.04] transition-colors duration-150 cursor-pointer',
                    isExpanded ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'
                  )}
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                >
                  <TableCell className="pr-0">
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground/60">
                    {entry.id}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(entry.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <SourceIcon className="h-3.5 w-3.5 text-muted-foreground/50" />
                      <span className="text-xs text-muted-foreground/60 capitalize">
                        {entry.source === 'image' ? 'Foto' : entry.source === 'audio' ? 'Áudio' : 'Texto'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm tabular-nums">
                    {entry.items.length}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums">
                    {total > 0 ? `R$${total.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-[10px]', statusConfig.className)}>
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Expanded items detail */}
      {expandedId && (() => {
        const entry = entries.find((e) => e.id === expandedId);
        if (!entry) return null;
        return (
          <div className="glass-card rounded-xl p-4 animate-fade-in">
            <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">
              Itens da Entrada #{entry.id}
            </p>
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                    Produto
                  </TableHead>
                  <TableHead className="w-20 text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                    Qtd
                  </TableHead>
                  <TableHead className="w-16 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                    Unidade
                  </TableHead>
                  <TableHead className="w-24 text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                    Unitário
                  </TableHead>
                  <TableHead className="w-24 text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.items.map((item) => (
                  <TableRow key={item.id} className="border-white/[0.04] hover:bg-white/[0.03]">
                    <TableCell className="text-sm font-medium">{item.productName}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {parseFloat(item.quantity)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground/50">{item.unit}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground/60">
                      {item.unitPrice ? `R$${parseFloat(item.unitPrice).toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      {item.totalPrice ? `R$${parseFloat(item.totalPrice).toFixed(2)}` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {entry.rawText && (
              <div className="mt-3 rounded-lg bg-white/[0.03] p-3">
                <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-1">
                  Texto original
                </p>
                <p className="text-xs text-muted-foreground/60 whitespace-pre-wrap">{entry.rawText}</p>
              </div>
            )}
          </div>
        );
      })()}

      <p className="text-[11px] text-muted-foreground/40">{entries.length} entradas</p>
    </div>
  );
}
