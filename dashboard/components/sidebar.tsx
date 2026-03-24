'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, BarChart3, Package, LogOut, IceCreamCone, ClipboardList, ClipboardCheck, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { href: '/produtos', label: 'Produtos', icon: BarChart3 },
  { href: '/estoque', label: 'Estoque', icon: Package },
  { href: '/fichas-tecnicas', label: 'Fichas Técnicas', icon: ClipboardList },
  { href: '/consolidacao', label: 'Inventário', icon: ClipboardCheck },
  { href: '/financeiro', label: 'Financeiro', icon: DollarSign },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-sidebar md:flex border-r border-border">
      {/* Logo area */}
      <div className="relative flex h-16 items-center gap-3 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-acai shadow-lg shadow-acai/20">
          <IceCreamCone className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-sm tracking-tight">Açaí do Japa</span>
          <p className="text-[10px] text-muted-foreground/60 font-medium">Dashboard</p>
        </div>
        <div className="absolute bottom-0 left-5 right-5 h-px bg-gradient-to-r from-acai/40 via-acai/20 to-transparent" />
      </div>

      <nav className="flex-1 space-y-1 p-3 pt-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Menu
        </p>
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-acai/15 text-acai shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full gradient-acai" />
              )}
              <Icon className={cn(
                'h-4 w-4 transition-colors duration-200',
                active ? 'text-acai' : 'text-muted-foreground/70 group-hover:text-foreground/80',
              )} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent mb-3" />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 rounded-xl text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-all duration-200 cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/90 backdrop-blur-xl md:hidden">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors duration-200',
              active ? 'text-acai' : 'text-muted-foreground/60',
            )}
          >
            {active && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full gradient-acai" />
            )}
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
