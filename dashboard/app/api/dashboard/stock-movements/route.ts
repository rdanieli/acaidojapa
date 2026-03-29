import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stockMovements, products } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { convertToGrams } from '@/lib/stock/convert-units';
import { checkAndCreateAlerts } from '@/lib/stock/check-alerts';
import { getTenantScope } from '@/lib/db/tenant';

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const conditions = [eq(stockMovements.tenantId, tenantId)];
    if (productId) conditions.push(eq(stockMovements.productId, Number(productId)));
    if (type) conditions.push(eq(stockMovements.type, type));
    if (startDate) conditions.push(gte(stockMovements.createdAt, new Date(startDate)));
    if (endDate) conditions.push(lte(stockMovements.createdAt, new Date(endDate)));

    const where = and(...conditions);

    const movements = await db
      .select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        productName: products.name,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        unit: stockMovements.unit,
        quantityG: stockMovements.quantityG,
        referenceType: stockMovements.referenceType,
        referenceId: stockMovements.referenceId,
        notes: stockMovements.notes,
        createdBy: stockMovements.createdBy,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .leftJoin(products, eq(stockMovements.productId, products.id))
      .where(where)
      .orderBy(desc(stockMovements.createdAt))
      .limit(200);

    return NextResponse.json({ movements });
  } catch (error) {
    console.error('[Stock Movements API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch movements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { productId, type, quantity, unit, notes } = await request.json();
    if (!productId || !type || !quantity || !unit) {
      return NextResponse.json({ error: 'productId, type, quantity, unit required' }, { status: 400 });
    }

    const [product] = await db.select().from(products).where(and(eq(products.id, Number(productId)), eq(products.tenantId, tenantId)));
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const qty = Number(quantity);
    const unitWeightG = product.unitWeightG ? Number(product.unitWeightG) : null;
    const quantityG = convertToGrams(qty, unit, unitWeightG);

    // Determine stock change direction
    const isDeduction = ['saida_venda', 'saida_manual'].includes(type);
    const stockChange = isDeduction ? -Math.abs(qty) : qty;

    // For deductions, we need to convert to the product's default unit if different
    let stockDelta = stockChange;
    if (unit.toLowerCase() !== product.defaultUnit.toLowerCase() && quantityG != null) {
      const { convertFromGrams } = await import('@/lib/stock/convert-units');
      const converted = convertFromGrams(Math.abs(quantityG), product.defaultUnit, unitWeightG);
      if (converted != null) {
        stockDelta = isDeduction ? -converted : converted;
      }
    }

    // Create movement
    const [movement] = await db.insert(stockMovements).values({
      tenantId,
      productId: Number(productId),
      type,
      quantity: String(qty),
      unit,
      quantityG: quantityG != null ? String(quantityG) : null,
      referenceType: 'manual',
      notes: notes || null,
      createdBy: 'dashboard',
    }).returning();

    // Update currentStock
    await db
      .update(products)
      .set({
        currentStock: sql`GREATEST(${products.currentStock}::numeric + ${String(stockDelta)}::numeric, 0)`,
      })
      .where(and(eq(products.id, Number(productId)), eq(products.tenantId, tenantId)));

    await checkAndCreateAlerts(Number(productId), tenantId);

    return NextResponse.json({ movement });
  } catch (error) {
    console.error('[Stock Movements API] Error:', error);
    return NextResponse.json({ error: 'Failed to create movement' }, { status: 500 });
  }
}
