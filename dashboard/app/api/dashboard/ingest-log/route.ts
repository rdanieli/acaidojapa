import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ingestEvents } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getTenantScope } from '@/lib/db/tenant';

export async function GET() {
  try {
    const { tenantId } = await getTenantScope();
    const events = await db.select().from(ingestEvents)
      .where(eq(ingestEvents.tenantId, tenantId))
      .orderBy(desc(ingestEvents.createdAt))
      .limit(50);
    return NextResponse.json({ events });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
