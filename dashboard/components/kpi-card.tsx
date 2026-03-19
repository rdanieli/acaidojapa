'use client';

import { Skeleton } from '@/components/ui/skeleton';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  loading?: boolean;
  variant?: 'acai' | 'teal' | 'amber' | 'red';
}

const variantStyles = {
  acai: {
    iconBg: 'bg-acai/15',
    iconColor: 'text-acai',
    glow: 'group-hover:shadow-acai/10',
  },
  teal: {
    iconBg: 'bg-teal/15',
    iconColor: 'text-teal',
    glow: 'group-hover:shadow-teal/10',
  },
  amber: {
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
    glow: 'group-hover:shadow-amber-500/10',
  },
  red: {
    iconBg: 'bg-red-500/15',
    iconColor: 'text-red-400',
    glow: 'group-hover:shadow-red-500/10',
  },
};

export function KpiCard({ title, value, subtitle, icon: Icon, loading, variant = 'acai' }: KpiCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'group glass-card-hover rounded-xl p-4 cursor-default',
        styles.glow,
        'hover:shadow-lg',
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5 min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {title}
          </p>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-28 shimmer" />
              <Skeleton className="h-3.5 w-20 shimmer" />
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {subtitle && (
                <p className="text-[11px] text-muted-foreground/60">{subtitle}</p>
              )}
            </>
          )}
        </div>
        <div className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200',
          styles.iconBg,
          'group-hover:scale-105',
        )}>
          <Icon className={cn('h-5 w-5', styles.iconColor)} />
        </div>
      </div>
    </div>
  );
}
