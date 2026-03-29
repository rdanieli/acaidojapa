'use client';

import { useQuery } from '@tanstack/react-query';

export interface Session {
  userId: number;
  tenantId: number;
  role: 'owner' | 'manager' | 'employee';
  email: string;
  tenant: {
    name: string;
    slug: string;
    onboardingCompleted: boolean;
  } | null;
}

export function useSession() {
  return useQuery<{ session: Session | null }>({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return { session: null };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useHasRole(minRole: 'owner' | 'manager' | 'employee'): boolean {
  const { data } = useSession();
  if (!data?.session) return false;
  const hierarchy: Record<string, number> = { owner: 3, manager: 2, employee: 1 };
  return hierarchy[data.session.role] >= hierarchy[minRole];
}
