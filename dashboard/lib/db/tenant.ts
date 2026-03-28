import { requireSession, type SessionPayload } from '@/lib/auth';

/**
 * Get the current session's tenantId for use in queries.
 * All data-fetching API routes should use this to scope queries.
 */
export async function getTenantScope(): Promise<SessionPayload> {
  return requireSession();
}

/**
 * Check if current user has at least the given role.
 * Role hierarchy: owner > manager > employee
 */
export function hasRole(session: SessionPayload, minRole: 'owner' | 'manager' | 'employee'): boolean {
  const hierarchy: Record<string, number> = { owner: 3, manager: 2, employee: 1 };
  return hierarchy[session.role] >= hierarchy[minRole];
}

/**
 * Require minimum role or throw.
 */
export function requireRole(session: SessionPayload, minRole: 'owner' | 'manager' | 'employee'): void {
  if (!hasRole(session, minRole)) {
    throw new Error(`Acesso negado. Requer permissão de ${minRole}.`);
  }
}
