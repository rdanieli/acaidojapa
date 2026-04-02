'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, ShoppingBag, BarChart3, Package, LogOut, Store, ClipboardList, ClipboardCheck, DollarSign, Settings, Trash2, CheckSquare, Tag, Receipt, Truck, Scan, Plug, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { href: '/pedidos', label: 'Pedidos', icon: ShoppingBag, module: 'pedidos' },
  { href: '/produtos', label: 'Produtos', icon: BarChart3, module: 'produtos' },
  { href: '/estoque', label: 'Estoque', icon: Package, module: 'estoque' },
  { href: '/fichas-tecnicas', label: 'Fichas Técnicas', icon: ClipboardList, module: 'fichas-tecnicas' },
  { href: '/consolidacao', label: 'Inventário', icon: ClipboardCheck, module: 'consolidacao' },
  { href: '/vendas', label: 'Vendas', icon: Receipt, module: 'vendas' },
  { href: '/fornecedores', label: 'Fornecedores', icon: Truck, module: 'fornecedores' },
  { href: '/financeiro', label: 'Financeiro', icon: DollarSign, module: 'financeiro', minRole: 'manager' as const },
  { href: '/desperdicios', label: 'Desperdícios', icon: Trash2, module: 'desperdicios' },
  { href: '/checklists', label: 'Checklists', icon: CheckSquare, module: 'checklists' },
  { href: '/etiquetas', label: 'Etiquetas', icon: Tag, module: 'etiquetas' },
  { href: '/scanner', label: 'Scanner', icon: Scan, module: 'scanner' },
  { href: '/integracoes', label: 'Integrações', icon: Plug, module: 'integracoes', minRole: 'owner' as const },
  { href: '/configuracoes', label: 'Configurações', icon: Settings, module: 'configuracoes', minRole: 'manager' as const },
];

/** All module IDs for the permission UI */
export const ALL_MODULES = links.map(l => ({ id: l.module, label: l.label }));

const roleHierarchy: Record<string, number> = { owner: 3, manager: 2, employee: 1 };

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: sessionData, isLoading: sessionLoading } = useSession();
  const role = sessionData?.session?.role || 'employee';
  const tenantName = sessionData?.session?.tenant?.name || 'Dashboard';
  const allowedModules = sessionData?.session?.allowedModules as string[] | null;
  const visibleLinks = links.filter(l => {
    // Role check
    if (l.minRole && roleHierarchy[role] < roleHierarchy[l.minRole]) return false;
    // Module check: owner/manager see all, employees see only allowed modules
    if (allowedModules && role === 'employee') {
      return allowedModules.includes(l.module);
    }
    return true;
  });

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
          <Store className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-sm tracking-tight">{tenantName}</span>
          <p className="text-[10px] text-muted-foreground/60 font-medium">Tongo Gestão</p>
        </div>
        <div className="absolute bottom-0 left-5 right-5 h-px bg-gradient-to-r from-acai/40 via-acai/20 to-transparent" />
      </div>

      <nav className="flex-1 space-y-1 p-3 pt-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Menu
        </p>
        {sessionLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-muted/30 animate-pulse mb-1" />
          ))
        ) : visibleLinks.map(({ href, label, icon: Icon }) => {
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
  const [showMore, setShowMore] = useState(false);
  const { data: sessionData, isLoading: sessionLoading } = useSession();
  if (sessionLoading) return null;
  const role = sessionData?.session?.role || 'employee';
  const allowedModules = sessionData?.session?.allowedModules as string[] | null;
  const allVisible = links.filter(l => {
    if (l.minRole && roleHierarchy[role] < roleHierarchy[l.minRole]) return false;
    if (allowedModules && role === 'employee') {
      return allowedModules.includes(l.module);
    }
    return true;
  });

  const mainLinks = allVisible.slice(0, 4);
  const overflowLinks = allVisible.slice(4);

  return (
    <>
      {/* Overflow menu */}
      {showMore && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute bottom-16 left-0 right-0 bg-background border-t border-border rounded-t-2xl p-4 animate-fade-in">
            <div className="grid grid-cols-4 gap-3">
              {overflowLinks.map(({ href, label, icon: Icon }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-2 rounded-xl text-[10px] font-medium',
                      active ? 'text-acai bg-acai/10' : 'text-muted-foreground/60',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/90 backdrop-blur-xl md:hidden">
        {mainLinks.map(({ href, label, icon: Icon }) => {
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
        {overflowLinks.length > 0 && (
          <button
            onClick={() => setShowMore(!showMore)}
            className={cn(
              'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors duration-200',
              showMore ? 'text-acai' : 'text-muted-foreground/60',
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            Mais
          </button>
        )}
      </nav>
    </>
  );
}
