import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { soldProducts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTenantScope } from '@/lib/db/tenant';

export async function GET() {
  try {
    const { tenantId } = await getTenantScope();
    const all = await db.select().from(soldProducts).where(eq(soldProducts.tenantId, tenantId)).orderBy(soldProducts.name);
    return NextResponse.json({ soldProducts: all });
  } catch (error) {
    console.error('[Sold Products API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch sold products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { name, sizeMl, category, price } = await request.json();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const [product] = await db.insert(soldProducts).values({
      tenantId,
      name,
      sizeMl: sizeMl != null ? Number(sizeMl) : null,
      category: category || null,
      price: price != null ? String(price) : null,
    }).returning();

    return NextResponse.json({ soldProduct: product });
  } catch (error) {
    console.error('[Sold Products API] Error:', error);
    return NextResponse.json({ error: 'Failed to create sold product' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { id, name, sizeMl, category, price, active } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const updates: any = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (sizeMl !== undefined) updates.sizeMl = sizeMl != null ? Number(sizeMl) : null;
    if (category !== undefined) updates.category = category || null;
    if (price !== undefined) updates.price = price != null ? String(price) : null;
    if (active !== undefined) updates.active = active;

    const [updated] = await db
      .update(soldProducts)
      .set(updates)
      .where(and(eq(soldProducts.id, Number(id)), eq(soldProducts.tenantId, tenantId)))
      .returning();

    return NextResponse.json({ soldProduct: updated });
  } catch (error) {
    console.error('[Sold Products API] Error:', error);
    return NextResponse.json({ error: 'Failed to update sold product' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    await db.delete(soldProducts).where(and(eq(soldProducts.id, Number(id)), eq(soldProducts.tenantId, tenantId)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Sold Products API] Error:', error);
    return NextResponse.json({ error: 'Failed to delete sold product' }, { status: 500 });
  }
}
