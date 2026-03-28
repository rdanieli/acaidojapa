import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, stockMovements } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { convertToGrams, convertFromGrams } from '@/lib/stock/convert-units';
import { checkAndCreateAlerts } from '@/lib/stock/check-alerts';
import { getTenantScope } from '@/lib/db/tenant';

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { items } = await request.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 });
    }

    const movements = [];

    for (const item of items) {
      const { productId, quantity, unit } = item;
      if (!productId || !quantity || !unit) continue;

      const [product] = await db.select().from(products).where(and(eq(products.id, Number(productId)), eq(products.tenantId, tenantId)));
      if (!product) continue;

      const qty = Number(quantity);
      const unitWeightG = product.unitWeightG ? Number(product.unitWeightG) : null;
      const quantityG = convertToGrams(qty, unit, unitWeightG);

      // Convert to default unit for stock deduction
      let stockDeduction = qty;
      if (unit.toLowerCase() !== product.defaultUnit.toLowerCase() && quantityG != null) {
        const converted = convertFromGrams(quantityG, product.defaultUnit, unitWeightG);
        if (converted != null) stockDeduction = converted;
      }

      const [movement] = await db.insert(stockMovements).values({
        tenantId,
        productId: Number(productId),
        type: 'saida_manual',
        quantity: String(qty),
        unit,
        quantityG: quantityG != null ? String(quantityG) : null,
        referenceType: 'manual',
        createdBy: 'dashboard',
      }).returning();

      movements.push(movement);

      await db
        .update(products)
        .set({
          currentStock: sql`GREATEST(${products.currentStock}::numeric - ${String(stockDeduction)}::numeric, 0)`,
        })
        .where(and(eq(products.id, Number(productId)), eq(products.tenantId, tenantId)));

      await checkAndCreateAlerts(Number(productId), tenantId);
    }

    return NextResponse.json({ ok: true, movements });
  } catch (error) {
    console.error('[Deduct Batch API] Error:', error);
    return NextResponse.json({ error: 'Failed to deduct batch' }, { status: 500 });
  }
}
