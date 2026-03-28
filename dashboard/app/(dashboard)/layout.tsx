'use client';

import { useState, useEffect } from 'react';
import { subDays, startOfWeek } from 'date-fns';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import type { DateRange } from 'react-day-picker';
import { Sidebar, MobileNav } from '@/components/sidebar';
import { DateRangePicker } from '@/components/date-range-picker';
import { ChannelToggle, type Channel } from '@/components/channel-toggle';
import { DashboardContext } from './context';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: sessionData } = useSession();

  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });
  const [channel, setChannel] = useState<Channel>('all');

  useEffect(() => {
    if (sessionData?.session?.tenant && !sessionData.session.tenant.onboardingCompleted && pathname !== '/onboarding') {
      router.push('/onboarding');
    }
  }, [sessionData, pathname, router]);

  return (
    <DashboardContext.Provider
      value={{
        dateRange,
        setDateRange,
        channel,
        setChannel,
        startDate: dateRange.from || subDays(new Date(), 6),
        endDate: dateRange.to || new Date(),
      }}
    >
      <div className="min-h-screen">
        {/* Subtle background gradient */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-acai/[0.03] blur-[150px]" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-teal/[0.02] blur-[120px]" />
        </div>

        <Sidebar />
        <MobileNav />

        <div className="relative z-10 md:pl-60">
          {/* Premium Topbar */}
          <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-3 md:px-6">
              <div className="flex items-center gap-3">
                <div className="hidden md:block">
                  <h1 className="text-sm font-semibold tracking-tight">Visão Geral</h1>
                  <p className="text-[11px] text-muted-foreground/60">Acompanhe suas vendas em tempo real</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ChannelToggle value={channel} onChange={setChannel} />
                <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
              </div>
            </div>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-acai/20 to-transparent" />
          </header>

          <main className="p-4 pb-20 md:p-6 md:pb-6">{children}</main>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
