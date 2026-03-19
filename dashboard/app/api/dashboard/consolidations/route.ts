import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stockConsolidations, consolidationItems, products } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Get specific consolidation with items
      const [consolidation] = await db
        .select()
        .from(stockConsolidations)
        .where(eq(stockConsolidations.id, Number(id)));

      if (!consolidation) {
        return NextResponse.json({ error: 'Consolidation not found' }, { status: 404 });
      }

      const items = await db
        .select({
          id: consolidationItems.id,
          consolidationId: consolidationItems.consolidationId,
          productId: consolidationItems.productId,
          productName: products.name,
          defaultUnit: products.defaultUnit,
          expectedStock: consolidationItems.expectedStock,
          actualStock: consolidationItems.actualStock,
          difference: consolidationItems.difference,
          notes: consolidationItems.notes,
        })
        .from(consolidationItems)
        .leftJoin(products, eq(consolidationItems.productId, products.id))
        .where(eq(consolidationItems.consolidationId, Number(id)))
        .orderBy(products.name);

      return NextResponse.json({ consolidation, items });
    }

    // List all consolidations
    const consolidations = await db
      .select()
      .from(stockConsolidations)
      .orderBy(desc(stockConsolidations.createdAt));

    return NextResponse.json({ consolidations });
  } catch (error) {
    console.error('[Consolidations API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch consolidations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Create consolidation
    const [consolidation] = await db.insert(stockConsolidations).values({
      date: new Date().toISOString().split('T')[0],
      notes: body.notes || null,
      createdBy: 'dashboard',
    }).returning();

    // Get all active products and create items with expected stock
    const activeProducts = await db
      .select()
      .from(products)
      .where(eq(products.active, true))
      .orderBy(products.name);

    if (activeProducts.length > 0) {
      await db.insert(consolidationItems).values(
        activeProducts.map((p) => ({
          consolidationId: consolidation.id,
          productId: p.id,
          expectedStock: p.currentStock,
        }))
      );
    }

    return NextResponse.json({ consolidation });
  } catch (error) {
    console.error('[Consolidations API] Error:', error);
    return NextResponse.json({ error: 'Failed to create consolidation' }, { status: 500 });
  }
}
