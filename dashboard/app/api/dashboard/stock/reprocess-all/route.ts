import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  products,
  stockMovements,
  processedOrders,
  dailyStockRuns,
  stockAlerts,
} from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { processDailySales } from '@/lib/stock/process-daily-sales';

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
      return true;
    }
  }
  return false;
}

export async function POST(request: NextRequest) {
  const isCookieAuth = request.cookies.has('auth-token');
  if (!isCookieAuth && !isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Step 1: Get all affected dates
    const runs = await db
      .select({ date: dailyStockRuns.date })
      .from(dailyStockRuns)
      .where(eq(dailyStockRuns.status, 'completed'));

    const dates = [...new Set(runs.map(r => r.date))].sort();

    if (dates.length === 0) {
      return NextResponse.json({ message: 'No completed runs found', dates: [] });
    }

    // Step 2: Reverse all daily_processing stock movements
    // Sum quantityG per product to know how much to add back
    const movementSums = await db
      .select({
        productId: stockMovements.productId,
        totalDeductedG: sql<string>`SUM(${stockMovements.quantityG}::numeric)`,
      })
      .from(stockMovements)
      .where(eq(stockMovements.referenceType, 'daily_processing'))
      .groupBy(stockMovements.productId);

    // Add back deducted quantities to currentStock
    for (const { productId, totalDeductedG } of movementSums) {
      if (!totalDeductedG || Number(totalDeductedG) === 0) continue;

      const [product] = await db
        .select({ defaultUnit: products.defaultUnit, unitWeightG: products.unitWeightG })
        .from(products)
        .where(eq(products.id, productId));

      if (!product) continue;

      // Convert grams back to product's default unit
      const grams = Number(totalDeductedG);
      let stockToAddBack: number;

      if (product.defaultUnit === 'g') {
        stockToAddBack = grams;
      } else if (product.defaultUnit === 'kg') {
        stockToAddBack = grams / 1000;
      } else if (product.defaultUnit === 'ml') {
        stockToAddBack = grams;
      } else if (product.defaultUnit === 'L') {
        stockToAddBack = grams / 1000;
      } else if (product.unitWeightG && Number(product.unitWeightG) > 0) {
        stockToAddBack = grams / Number(product.unitWeightG);
      } else {
        stockToAddBack = grams / 1000;
      }

      await db
        .update(products)
        .set({
          currentStock: sql`${products.currentStock}::numeric + ${String(stockToAddBack)}::numeric`,
        })
        .where(eq(products.id, productId));
    }

    // Step 3: Delete all daily_processing movements
    const deletedMovements = await db
      .delete(stockMovements)
      .where(eq(stockMovements.referenceType, 'daily_processing'))
      .returning({ id: stockMovements.id });

    // Step 4: Clear processedOrders
    const deletedProcessed = await db
      .delete(processedOrders)
      .returning({ id: processedOrders.id });

    // Step 5: Clear dailyStockRuns
    const deletedRuns = await db
      .delete(dailyStockRuns)
      .returning({ id: dailyStockRuns.id });

    // Step 6: Resolve all existing stock alerts (will be recreated if needed)
    await db
      .update(stockAlerts)
      .set({ status: 'resolved', resolvedAt: new Date() })
      .where(eq(stockAlerts.status, 'active'));

    // Step 7: Snapshot stock before reprocessing
    const stockBefore = await db
      .select({ id: products.id, name: products.name, currentStock: products.currentStock, category: products.category })
      .from(products)
      .where(eq(products.active, true));

    // Step 8: Reprocess each date in chronological order
    const reprocessResults: { date: string; ordersProcessed: number; errors: number; unmatchedItems: string[] }[] = [];

    for (const date of dates) {
      try {
        const result = await processDailySales(date);
        reprocessResults.push({
          date,
          ordersProcessed: result.ordersProcessed,
          errors: result.errors,
          unmatchedItems: result.unmatchedItems,
        });
      } catch (err: any) {
        reprocessResults.push({
          date,
          ordersProcessed: 0,
          errors: 1,
          unmatchedItems: [`FATAL: ${err.message}`],
        });
      }
    }

    // Step 9: Snapshot stock after reprocessing
    const stockAfter = await db
      .select({ id: products.id, name: products.name, currentStock: products.currentStock, category: products.category })
      .from(products)
      .where(eq(products.active, true));

    // Build comparison for complement products
    const comparison = stockAfter
      .filter(p => p.category === 'complemento' || p.name === 'Açaí')
      .map(after => {
        const before = stockBefore.find(b => b.id === after.id);
        return {
          product: after.name,
          category: after.category,
          stockBefore: before?.currentStock ?? '?',
          stockAfter: after.currentStock,
          diff: before ? (Number(after.currentStock) - Number(before.currentStock)).toFixed(3) : '?',
        };
      })
      .sort((a, b) => Number(a.diff) - Number(b.diff));

    return NextResponse.json({
      summary: {
        datesReprocessed: dates.length,
        movementsDeleted: deletedMovements.length,
        processedOrdersCleared: deletedProcessed.length,
        runsCleared: deletedRuns.length,
        productsReversed: movementSums.length,
      },
      reprocessResults,
      stockComparison: comparison,
    });
  } catch (error: any) {
    console.error('[Reprocess All] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to reprocess' }, { status: 500 });
  }
}
