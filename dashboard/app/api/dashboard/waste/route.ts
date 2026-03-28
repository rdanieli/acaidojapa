import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { wasteEntries, products, stockMovements } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { getTenantScope } from '@/lib/db/tenant';

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const productId = searchParams.get('productId');

    let conditions = [eq(wasteEntries.tenantId, tenantId)];
    if (startDate) conditions.push(gte(wasteEntries.date, startDate));
    if (endDate) conditions.push(lte(wasteEntries.date, endDate));
    if (productId) conditions.push(eq(wasteEntries.productId, Number(productId)));

    const entries = await db
      .select({
        id: wasteEntries.id,
        productId: wasteEntries.productId,
        productName: products.name,
        quantity: wasteEntries.quantity,
        unit: wasteEntries.unit,
        reason: wasteEntries.reason,
        notes: wasteEntries.notes,
        date: wasteEntries.date,
        createdAt: wasteEntries.createdAt,
      })
      .from(wasteEntries)
      .leftJoin(products, eq(wasteEntries.productId, products.id))
      .where(and(...conditions))
      .orderBy(desc(wasteEntries.createdAt));

    // Summary stats
    const totalWaste = entries.reduce((sum, e) => {
      const cost = 0; // Will be enhanced later with product cost lookup
      return sum + Math.abs(Number(e.quantity));
    }, 0);

    return NextResponse.json({ entries, totalQuantity: totalWaste });
  } catch (error: any) {
    console.error('[Waste API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = await getTenantScope();
    const { productId, quantity, unit, reason, notes, date } = await request.json();

    if (!productId || !quantity || !unit || !reason || !date) {
      return NextResponse.json({ error: 'productId, quantity, unit, reason, date obrigatórios' }, { status: 400 });
    }

    // 1. Create waste entry
    const [entry] = await db.insert(wasteEntries).values({
      tenantId,
      productId: Number(productId),
      quantity: String(quantity),
      unit,
      reason,
      notes: notes || null,
      recordedBy: userId || null,
      date,
    }).returning();

    // 2. Create stock movement (negative = stock out)
    await db.insert(stockMovements).values({
      tenantId,
      productId: Number(productId),
      type: 'saida_desperdicio',
      quantity: String(-Math.abs(Number(quantity))),
      unit,
      referenceType: 'waste',
      referenceId: entry.id,
      notes: `Desperdício: ${reason}${notes ? ' - ' + notes : ''}`,
      createdBy: 'dashboard',
    });

    // 3. Update product stock
    const absQty = Math.abs(Number(quantity));
    await db.update(products)
      .set({ currentStock: sql`${products.currentStock} - ${absQty}` })
      .where(and(eq(products.id, Number(productId)), eq(products.tenantId, tenantId)));

    return NextResponse.json({ entry });
  } catch (error: any) {
    console.error('[Waste API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
