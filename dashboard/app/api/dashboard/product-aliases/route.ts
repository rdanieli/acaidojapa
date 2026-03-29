import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productNameAliases, soldProducts } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getTenantScope } from '@/lib/db/tenant';

export async function GET() {
  try {
    const { tenantId } = await getTenantScope();
    const aliases = await db
      .select({
        id: productNameAliases.id,
        alias: productNameAliases.alias,
        soldProductId: productNameAliases.soldProductId,
        soldProductName: soldProducts.name,
        source: productNameAliases.source,
        createdAt: productNameAliases.createdAt,
      })
      .from(productNameAliases)
      .leftJoin(soldProducts, eq(productNameAliases.soldProductId, soldProducts.id))
      .where(eq(productNameAliases.tenantId, tenantId))
      .orderBy(desc(productNameAliases.createdAt));

    return NextResponse.json({ aliases });
  } catch (error) {
    console.error('[Product Aliases] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch aliases' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { alias, soldProductId } = await request.json();
    if (!alias || !soldProductId) {
      return NextResponse.json({ error: 'alias and soldProductId required' }, { status: 400 });
    }

    // Normalize the alias
    const normalized = alias
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const [created] = await db.insert(productNameAliases).values({
      tenantId,
      alias: normalized,
      soldProductId: Number(soldProductId),
      source: 'manual',
    }).returning();

    return NextResponse.json({ ok: true, alias: created });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Alias already exists' }, { status: 409 });
    }
    console.error('[Product Aliases] Error:', error);
    return NextResponse.json({ error: 'Failed to create alias' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await db.delete(productNameAliases).where(and(eq(productNameAliases.id, Number(id)), eq(productNameAliases.tenantId, tenantId)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Product Aliases] Error:', error);
    return NextResponse.json({ error: 'Failed to delete alias' }, { status: 500 });
  }
}
