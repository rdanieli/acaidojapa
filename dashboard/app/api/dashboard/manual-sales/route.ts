import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { manualSales, products, stockMovements, recipes } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { getTenantScope } from '@/lib/db/tenant';

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let conditions = [eq(manualSales.tenantId, tenantId)];
    if (startDate) conditions.push(gte(manualSales.date, startDate));
    if (endDate) conditions.push(lte(manualSales.date, endDate));

    const sales = await db.select().from(manualSales)
      .where(and(...conditions))
      .orderBy(desc(manualSales.createdAt));

    return NextResponse.json({ sales });
  } catch (error: any) {
    console.error('[Manual Sales API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = await getTenantScope();
    const { date, items, paymentMethod, notes } = await request.json();

    if (!date || !items?.length) {
      return NextResponse.json({ error: 'date e items obrigatórios' }, { status: 400 });
    }

    // Calculate total
    const total = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);

    // Create the sale
    const [sale] = await db.insert(manualSales).values({
      tenantId,
      date,
      total: String(total),
      paymentMethod: paymentMethod || null,
      notes: notes || null,
      items,
      recordedBy: userId || null,
    }).returning();

    // Deduct stock based on recipes for each item
    for (const item of items) {
      if (!item.soldProductId) continue;

      // Get recipe for this sold product
      const recipeItems = await db.select().from(recipes)
        .where(and(
          eq(recipes.soldProductId, item.soldProductId),
          eq(recipes.tenantId, tenantId)
        ));

      // Deduct each ingredient
      for (const ri of recipeItems) {
        const deductG = Number(ri.quantityG) * Number(item.quantity);
        if (deductG <= 0) continue;

        await db.insert(stockMovements).values({
          tenantId,
          productId: ri.productId,
          type: 'saida_venda',
          quantity: String(-deductG),
          unit: 'g',
          quantityG: String(-deductG),
          referenceType: 'manual_sale',
          referenceId: sale.id,
          createdBy: 'dashboard',
        });

        await db.update(products)
          .set({ currentStock: sql`${products.currentStock} - ${deductG}` })
          .where(and(eq(products.id, ri.productId), eq(products.tenantId, tenantId)));
      }
    }

    return NextResponse.json({ sale });
  } catch (error: any) {
    console.error('[Manual Sales API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
