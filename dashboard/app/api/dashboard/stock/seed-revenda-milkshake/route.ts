import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { seedRevendaAndMilkshake } from '@/lib/stock/seed-revenda-milkshake';
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

    const result = await seedRevendaAndMilkshake(tenantId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    console.error('[Seed Revenda/Milkshake] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to seed' }, { status: 500 });
  }
}
