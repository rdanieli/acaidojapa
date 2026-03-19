import { NextRequest, NextResponse } from 'next/server';
import { syncOrdersForRange, getLastSyncDate } from '@/lib/sync-orders';
import { formatDateISO } from '@/lib/format';

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
      return true;
    }
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const isCookieAuth = request.cookies.has('auth-token');
    if (!isCookieAuth && !isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const today = formatDateISO(new Date());

    // Default: sync today. Can pass start/end for bulk import.
    const start = body.start || today;
    const end = body.end || start;

    const result = await syncOrdersForRange(start, end);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Sync Orders] Error:', error);
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const lastDate = await getLastSyncDate();
    return NextResponse.json({ lastSyncDate: lastDate });
  } catch (error: any) {
    console.error('[Sync Orders] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
