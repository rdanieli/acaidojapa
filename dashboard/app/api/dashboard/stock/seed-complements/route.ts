import { NextRequest, NextResponse } from 'next/server';
import { seedComplementGramages } from '@/lib/stock/seed-complements';

export async function POST(request: NextRequest) {
  try {
    // Auth: cookie (via middleware) or CRON_SECRET bearer token
    const isCookieAuth = request.cookies.has('auth-token');
    if (!isCookieAuth) {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await seedComplementGramages();
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    console.error('[Seed Complements] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to seed complements' }, { status: 500 });
  }
}
