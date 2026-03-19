import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productNameAliases, soldProducts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
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
      .orderBy(desc(productNameAliases.createdAt));

    return NextResponse.json({ aliases });
  } catch (error) {
    console.error('[Product Aliases] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch aliases' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await db.delete(productNameAliases).where(eq(productNameAliases.id, Number(id)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Product Aliases] Error:', error);
    return NextResponse.json({ error: 'Failed to delete alias' }, { status: 500 });
  }
}
