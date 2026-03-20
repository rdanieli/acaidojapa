import { NextRequest, NextResponse } from 'next/server';
import { seedRevendaAndMilkshake } from '@/lib/stock/seed-revenda-milkshake';

export async function POST(request: NextRequest) {
  try {
    const isCookieAuth = request.cookies.has('auth-token');
    if (!isCookieAuth) {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await seedRevendaAndMilkshake();
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    console.error('[Seed Revenda/Milkshake] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to seed' }, { status: 500 });
  }
}
