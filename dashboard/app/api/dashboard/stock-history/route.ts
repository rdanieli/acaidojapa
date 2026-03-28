import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stockMovements, products } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { getTenantScope } from '@/lib/db/tenant';

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const days = Number(searchParams.get('days') || '30');

    if (!productId) {
      return NextResponse.json({ error: 'productId obrigatório' }, { status: 400 });
    }

    // Get current stock
    const [product] = await db.select({
      currentStock: products.currentStock,
      name: products.name,
      defaultUnit: products.defaultUnit,
    }).from(products)
      .where(and(eq(products.id, Number(productId)), eq(products.tenantId, tenantId)));

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Get daily net movements for the period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().split('T')[0];

    const dailyMovements = await db
      .select({
        date: sql<string>`DATE(${stockMovements.createdAt})`,
        netChange: sql<string>`SUM(CAST(${stockMovements.quantity} AS numeric))`,
      })
      .from(stockMovements)
      .where(and(
        eq(stockMovements.productId, Number(productId)),
        eq(stockMovements.tenantId, tenantId),
        gte(sql`DATE(${stockMovements.createdAt})`, startStr),
      ))
      .groupBy(sql`DATE(${stockMovements.createdAt})`)
      .orderBy(sql`DATE(${stockMovements.createdAt})`);

    // Build stock level history going backwards from current stock
    const currentStock = Number(product.currentStock) || 0;

    // Calculate total net change in the period
    const totalNetChange = dailyMovements.reduce((sum, d) => sum + Number(d.netChange), 0);

    // Stock at start of period = current - total changes since then
    let runningStock = currentStock - totalNetChange;

    // Build day-by-day levels
    const history: { date: string; stock: number }[] = [];
    const today = new Date();

    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const movement = dailyMovements.find(m => m.date === dateStr);
      if (movement) {
        runningStock += Number(movement.netChange);
      }

      history.push({
        date: dateStr,
        stock: Math.round(runningStock * 100) / 100,
      });
    }

    return NextResponse.json({
      productName: product.name,
      unit: product.defaultUnit,
      currentStock,
      history,
    });
  } catch (error: any) {
    console.error('[Stock History API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
