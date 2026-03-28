import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventoryEntries, inventoryItems, products, stockMovements } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { convertToGrams, convertFromGrams } from '@/lib/stock/convert-units';
import { checkAndCreateAlerts } from '@/lib/stock/check-alerts';
import { getTenantScope } from '@/lib/db/tenant';

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const baseCondition = eq(inventoryEntries.tenantId, tenantId);
    const entries = status
      ? await db
          .select()
          .from(inventoryEntries)
          .where(and(baseCondition, eq(inventoryEntries.status, status)))
          .orderBy(desc(inventoryEntries.createdAt))
          .limit(100)
      : await db
          .select()
          .from(inventoryEntries)
          .where(baseCondition)
          .orderBy(desc(inventoryEntries.createdAt))
          .limit(100);

    const entriesWithItems = await Promise.all(
      entries.map(async (entry) => {
        const items = await db
          .select()
          .from(inventoryItems)
          .where(eq(inventoryItems.entryId, entry.id));
        return { ...entry, items };
      })
    );

    return NextResponse.json({ entries: entriesWithItems });
  } catch (error) {
    console.error('[Inventory API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory entries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { id, action } = await request.json();
    if (!id || !action) {
      return NextResponse.json({ error: 'id and action required' }, { status: 400 });
    }

    const [entry] = await db.select().from(inventoryEntries).where(and(eq(inventoryEntries.id, Number(id)), eq(inventoryEntries.tenantId, tenantId))).limit(1);
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    if (action === 'reject') {
      await db.update(inventoryEntries).set({ status: 'rejected' }).where(and(eq(inventoryEntries.id, entry.id), eq(inventoryEntries.tenantId, tenantId)));
      return NextResponse.json({ ok: true });
    }

    if (action === 'confirm') {
      // Update entry status
      await db.update(inventoryEntries).set({ status: 'confirmed', confirmedAt: new Date() }).where(and(eq(inventoryEntries.id, entry.id), eq(inventoryEntries.tenantId, tenantId)));

      // Apply stock for each item
      const items = await db.select().from(inventoryItems).where(eq(inventoryItems.entryId, entry.id));

      for (const item of items) {
        if (!item.productId) continue;
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) continue;

        const [product] = await db.select().from(products).where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));
        if (!product) continue;

        const unitWeightG = product.unitWeightG ? Number(product.unitWeightG) : null;

        let stockIncrement: number;
        if (item.unit.toLowerCase() === product.defaultUnit.toLowerCase()) {
          stockIncrement = qty;
        } else {
          const inGrams = convertToGrams(qty, item.unit, unitWeightG);
          if (inGrams == null) {
            stockIncrement = qty;
          } else {
            const converted = convertFromGrams(inGrams, product.defaultUnit, unitWeightG);
            stockIncrement = converted ?? qty;
          }
        }

        await db.update(products).set({
          currentStock: sql`${products.currentStock}::numeric + ${String(stockIncrement)}::numeric`,
        }).where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));

        const quantityG = convertToGrams(qty, item.unit, unitWeightG);
        await db.insert(stockMovements).values({
          tenantId,
          productId: item.productId,
          type: 'entrada',
          quantity: String(qty),
          unit: item.unit,
          quantityG: quantityG != null ? String(quantityG) : null,
          referenceType: 'inventory_entry',
          referenceId: entry.id,
          createdBy: 'dashboard',
        });

        await checkAndCreateAlerts(item.productId, tenantId);
      }

      return NextResponse.json({ ok: true, itemsProcessed: items.length });
    }

    return NextResponse.json({ error: 'Invalid action. Use confirm or reject' }, { status: 400 });
  } catch (error) {
    console.error('[Inventory API] Error:', error);
    return NextResponse.json({ error: 'Failed to process entry' }, { status: 500 });
  }
}
