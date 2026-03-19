'use client';

import { createContext, useContext } from 'react';
import type { DateRange } from 'react-day-picker';
import type { Channel } from '@/components/channel-toggle';

interface DashboardContextValue {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  channel: Channel;
  setChannel: (channel: Channel) => void;
  startDate: Date;
  endDate: Date;
}

export const DashboardContext = createContext<DashboardContextValue>(null!);

export function useDashboard() {
  return useContext(DashboardContext);
}
