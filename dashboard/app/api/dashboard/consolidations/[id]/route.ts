import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stockConsolidations, consolidationItems, products, stockMovements } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { checkAndCreateAlerts } from '@/lib/stock/check-alerts';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { items } = await request.json();
    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 });
    }

    for (const item of items) {
      const actual = item.actualStock != null ? Number(item.actualStock) : null;
      const updates: any = {};
      if (actual != null) {
        updates.actualStock = String(actual);
        // Calculate difference: will be set when we know expected
        const [existing] = await db
          .select()
          .from(consolidationItems)
          .where(eq(consolidationItems.id, Number(item.id)));
        if (existing) {
          const expected = Number(existing.expectedStock) || 0;
          updates.difference = String(actual - expected);
        }
      }
      if (item.notes !== undefined) updates.notes = item.notes || null;

      await db
        .update(consolidationItems)
        .set(updates)
        .where(eq(consolidationItems.id, Number(item.id)));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Consolidation Update API] Error:', error);
    return NextResponse.json({ error: 'Failed to update consolidation' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { action } = await request.json();

    if (action !== 'finalize') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get consolidation items
    const items = await db
      .select()
      .from(consolidationItems)
      .where(eq(consolidationItems.consolidationId, Number(id)));

    // Create stock movements for differences and update currentStock
    for (const item of items) {
      if (item.actualStock == null) continue;

      const actual = Number(item.actualStock);
      const expected = Number(item.expectedStock) || 0;
      const diff = actual - expected;

      // Get product to use correct unit
      const [product] = await db.select().from(products).where(eq(products.id, item.productId));
      if (!product) continue;

      if (diff !== 0) {
        await db.insert(stockMovements).values({
          productId: item.productId,
          type: 'consolidacao',
          quantity: String(Math.abs(diff)),
          unit: product.defaultUnit,
          notes: `Inventário #${id}: ${diff > 0 ? 'sobra' : 'falta'} de ${Math.abs(diff)} ${product.defaultUnit}`,
          referenceType: 'consolidation',
          referenceId: Number(id),
          createdBy: 'dashboard',
        });
      }

      // Set currentStock to actual counted value
      await db
        .update(products)
        .set({ currentStock: String(actual) })
        .where(eq(products.id, item.productId));

      await checkAndCreateAlerts(item.productId);
    }

    // Finalize
    await db
      .update(stockConsolidations)
      .set({ status: 'finalized', finalizedAt: new Date() })
      .where(eq(stockConsolidations.id, Number(id)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Consolidation Finalize API] Error:', error);
    return NextResponse.json({ error: 'Failed to finalize consolidation' }, { status: 500 });
  }
}
