/**
 * GET /api/auth/magic-link?token=...
 *
 * Validates a short-lived magic-link JWT (issued by /api/billing/stripe-provision),
 * sets the regular auth-token cookie, and redirects to /onboarding (or /
 * for tenants that already finished onboarding).
 *
 * Used after a Stripe checkout completes — the welcome email contains the
 * magic-link URL so the customer can sign in without ever setting a password.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyMagicLinkToken, createToken } from '@/lib/auth';

/**
 * Public-facing base URL of the dashboard. We can't rely on `request.url`
 * because behind the nginx proxy Next.js sees the internal bind
 * (http://0.0.0.0:3001), so absolute redirects need the real host.
 */
function publicBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host && !host.startsWith('0.0.0.0') && !host.startsWith('localhost')) {
    return `${proto}://${host}`;
  }
  return 'https://app.japagestao.com.br';
}

function redirectWithError(request: NextRequest, message: string) {
  const base = publicBaseUrl(request);
  const url = new URL('/login', base);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return redirectWithError(request, 'missing-token');

  let payload;
  try {
    payload = await verifyMagicLinkToken(token);
  } catch (err) {
    console.warn('[magic-link] Invalid or expired token:', (err as Error).message);
    return redirectWithError(request, 'invalid-or-expired');
  }

  // Confirm user still exists and is active.
  const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!user || !user.active) return redirectWithError(request, 'user-not-found');

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId)).limit(1);
  if (!tenant || !tenant.active) return redirectWithError(request, 'tenant-not-found');

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  const sessionToken = await createToken({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role as 'owner' | 'manager' | 'employee',
    email: user.email,
  });

  const dest = tenant.onboardingCompleted ? '/' : '/onboarding';
  const response = NextResponse.redirect(new URL(dest, publicBaseUrl(request)));
  response.cookies.set('auth-token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400,
    path: '/',
  });
  return response;
}
