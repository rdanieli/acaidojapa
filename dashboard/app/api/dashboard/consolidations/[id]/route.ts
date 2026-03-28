import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stockConsolidations, consolidationItems, products, stockMovements } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { checkAndCreateAlerts } from '@/lib/stock/check-alerts';
import { getTenantScope } from '@/lib/db/tenant';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantScope();
    const { id } = await params;
    const { items } = await request.json();
    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 });
    }

    // Verify consolidation belongs to tenant
    const [consolidation] = await db.select().from(stockConsolidations).where(and(eq(stockConsolidations.id, Number(id)), eq(stockConsolidations.tenantId, tenantId)));
    if (!consolidation) return NextResponse.json({ error: 'Consolidation not found' }, { status: 404 });

    for (const item of items) {
      const actual = item.actualStock != null ? Number(item.actualStock) : null;
      const updates: any = {};
      if (actual != null) {
        updates.actualStock = String(actual);
        const [existing] = await db
          .select()
          .from(consolidationItems)
          .where(and(eq(consolidationItems.id, Number(item.id)), eq(consolidationItems.tenantId, tenantId)));
        if (existing) {
          const expected = Number(existing.expectedStock) || 0;
          updates.difference = String(actual - expected);
        }
      }
      if (item.notes !== undefined) updates.notes = item.notes || null;

      await db
        .update(consolidationItems)
        .set(updates)
        .where(and(eq(consolidationItems.id, Number(item.id)), eq(consolidationItems.tenantId, tenantId)));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Consolidation Update API] Error:', error);
    return NextResponse.json({ error: 'Failed to update consolidation' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantScope();
    const { id } = await params;
    const { action } = await request.json();

    if (action !== 'finalize') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Verify consolidation belongs to tenant
    const [consolidation] = await db.select().from(stockConsolidations).where(and(eq(stockConsolidations.id, Number(id)), eq(stockConsolidations.tenantId, tenantId)));
    if (!consolidation) return NextResponse.json({ error: 'Consolidation not found' }, { status: 404 });

    // Get consolidation items
    const items = await db
      .select()
      .from(consolidationItems)
      .where(and(eq(consolidationItems.consolidationId, Number(id)), eq(consolidationItems.tenantId, tenantId)));

    // Create stock movements for differences and update currentStock
    for (const item of items) {
      if (item.actualStock == null) continue;

      const actual = Number(item.actualStock);
      const expected = Number(item.expectedStock) || 0;
      const diff = actual - expected;

      // Get product to use correct unit
      const [product] = await db.select().from(products).where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));
      if (!product) continue;

      if (diff !== 0) {
        await db.insert(stockMovements).values({
          tenantId,
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
        .where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));

      await checkAndCreateAlerts(item.productId, tenantId);
    }

    // Finalize
    await db
      .update(stockConsolidations)
      .set({ status: 'finalized', finalizedAt: new Date() })
      .where(and(eq(stockConsolidations.id, Number(id)), eq(stockConsolidations.tenantId, tenantId)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Consolidation Finalize API] Error:', error);
    return NextResponse.json({ error: 'Failed to finalize consolidation' }, { status: 500 });
  }
}
