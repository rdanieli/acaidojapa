'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, X, Receipt, Package, Trash2, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
  { href: '/vendas', label: 'Nova venda', icon: Receipt, color: 'bg-emerald-500' },
  { href: '/estoque', label: 'Entrada de estoque', icon: Package, color: 'bg-blue-500' },
  { href: '/desperdicios', label: 'Registrar desperdício', icon: Trash2, color: 'bg-amber-500' },
  { href: '/checklists', label: 'Checklists', icon: ClipboardCheck, color: 'bg-purple-500' },
];

export function QuickActions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex flex-col items-end gap-2">
      {/* Action buttons (visible when open) */}
      {open && (
        <div className="flex flex-col gap-2 animate-fade-in">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-full pl-4 pr-3 py-2 bg-background border border-border shadow-lg hover:shadow-xl transition-all group"
              >
                <span className="text-sm font-medium text-foreground whitespace-nowrap">{action.label}</span>
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-white shrink-0', action.color)}>
                  <Icon className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* FAB toggle */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200',
          open
            ? 'bg-muted text-foreground rotate-45'
            : 'gradient-acai text-white hover:shadow-xl hover:shadow-acai/25'
        )}
      >
        {open ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      </button>
    </div>
  );
}
