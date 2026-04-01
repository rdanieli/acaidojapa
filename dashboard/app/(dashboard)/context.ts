'use client';

import { createContext, useContext } from 'react';
import type { DateRange } from 'react-day-picker';
interface DashboardContextValue {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  startDate: Date;
  endDate: Date;
}

export const DashboardContext = createContext<DashboardContextValue>(null!);

export function useDashboard() {
  return useContext(DashboardContext);
}
