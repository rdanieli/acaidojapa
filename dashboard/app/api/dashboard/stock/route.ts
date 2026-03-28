import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTenantScope } from '@/lib/db/tenant';

export async function GET() {
  try {
    const { tenantId } = await getTenantScope();
    const items = await db
      .select()
      .from(products)
      .where(and(eq(products.active, true), eq(products.tenantId, tenantId)));
    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('Stock error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
