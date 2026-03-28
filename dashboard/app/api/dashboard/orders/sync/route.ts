import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { syncOrdersForRange, getLastSyncDate } from '@/lib/sync-orders';
import { formatDateISO } from '@/lib/format';
import { getTenantScope } from '@/lib/db/tenant';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    let tenantId: number;
    if (isCron) {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.active, true)).limit(1);
      if (!tenant) return NextResponse.json({ error: 'No active tenant' }, { status: 404 });
      tenantId = tenant.id;
    } else {
      const session = await getTenantScope();
      tenantId = session.tenantId;
    }

    const body = await request.json().catch(() => ({}));
    const today = formatDateISO(new Date());

    // Default: sync today. Can pass start/end for bulk import.
    const start = body.start || today;
    const end = body.end || start;

    const result = await syncOrdersForRange(start, end, tenantId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Sync Orders] Error:', error);
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    let tenantId: number;
    if (isCron) {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.active, true)).limit(1);
      if (!tenant) return NextResponse.json({ error: 'No active tenant' }, { status: 404 });
      tenantId = tenant.id;
    } else {
      const session = await getTenantScope();
      tenantId = session.tenantId;
    }

    const lastDate = await getLastSyncDate(tenantId);
    return NextResponse.json({ lastSyncDate: lastDate });
  } catch (error: any) {
    console.error('[Sync Orders] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
