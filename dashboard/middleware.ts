import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = [
  '/login',
  '/registro',
  '/docs',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/magic-link',
  '/api/auth/session',
  '/api/billing/stripe-provision',
  '/api/webhook',
  // Cron-callable paths (auth checked in route handler via CRON_SECRET)
  '/api/dashboard/stock/process-daily-sales',
  '/api/dashboard/stock/seed-complements',
  '/api/dashboard/stock/seed-revenda-milkshake',
  '/api/dashboard/orders/sync',
  '/api/dashboard/stock/shopping-list',
  '/api/v1',
];

const UNAUTH_REDIRECT_URL = 'https://japagestao.com.br';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return NextResponse.redirect(UNAUTH_REDIRECT_URL);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(UNAUTH_REDIRECT_URL);
    response.cookies.delete('auth-token');
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
