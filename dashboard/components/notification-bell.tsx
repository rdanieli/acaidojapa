'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Package, AlertTriangle, ClipboardCheck, Inbox } from 'lucide-react';
import { useNotifications } from '@/hooks/use-dashboard';
import { cn } from '@/lib/utils';

const typeConfig: Record<string, { icon: any; color: string }> = {
  out_of_stock: { icon: AlertTriangle, color: 'text-red-400' },
  low_stock: { icon: Package, color: 'text-amber-400' },
  pending_entry: { icon: Inbox, color: 'text-blue-400' },
  checklist_pending: { icon: ClipboardCheck, color: 'text-purple-400' },
};

export function NotificationBell() {
  const { data } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = data?.count || 0;
  const notifications = data?.notifications || [];

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-muted/60 transition-colors"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-background shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Notificações</h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground/50">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((n: any) => {
                const config = typeConfig[n.type] || { icon: Bell, color: 'text-muted-foreground' };
                const Icon = config.icon;
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                  >
                    <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', config.color)} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">{n.description}</p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
