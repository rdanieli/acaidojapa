import 'server-only';
import { db } from '@/lib/db';
import {
  products,
  complementGramages,
  processedOrders,
  dailyStockRuns,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { syncOrdersForDate } from '@/lib/sync-orders';
import { getLocalOrders } from '@/lib/local-orders';
import { parseOrderItem, clearParserCaches, mlToSizeTier } from './parse-order-item';
import { deductProductStock } from './deduct-stock';
import type { UnifiedOrder } from '@/lib/types';

/** Açaí product ID in the products table (the base polpa) */
const ACAI_PRODUCT_NAME = 'Açaí';

/** Cup total weight = sizeMl in grams (200ml cup = 200g total) */
const CUP_WEIGHTS: Record<number, number> = {
  200: 200,
  300: 300,
  400: 400,
  500: 500,
  700: 700,
};

interface RunResult {
  runId: number;
  date: string;
  ordersFetched: number;
  ordersProcessed: number;
  ordersSkipped: number;
  errors: number;
  unmatchedItems: string[];
  errorDetails: string[];
  status: 'completed' | 'failed';
}

async function getAcaiProductId(): Promise<number | null> {
  const [p] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.name, ACAI_PRODUCT_NAME))
    .limit(1);
  return p?.id ?? null;
}

export async function processDailySales(date: string): Promise<RunResult> {
  clearParserCaches();

  const [run] = await db.insert(dailyStockRuns).values({
    date,
    status: 'running',
  }).returning();

  const unmatchedItems: string[] = [];
  const errorDetails: string[] = [];
  let ordersProcessed = 0;
  let ordersSkipped = 0;
  let errorCount = 0;

  try {
    // Step 1: Sync orders from external APIs into local DB
    try {
      await syncOrdersForDate(date);
    } catch (err: any) {
      errorDetails.push(`Sync error: ${err.message}`);
    }

    // Step 2: Read from local DB
    const allOrders = await getLocalOrders(date, date);
    const completedOrders = allOrders.filter(o => o.status === 'completed');
    const ordersFetched = completedOrders.length;

    // Get açaí product ID once
    const acaiProductId = await getAcaiProductId();

    // Process each order
    for (const order of completedOrders) {
      try {
        // Skip if already processed
        const [existing] = await db
          .select()
          .from(processedOrders)
          .where(eq(processedOrders.orderId, order.id))
          .limit(1);

        if (existing) {
          ordersSkipped++;
          continue;
        }

        let orderErrors: string[] = [];

        for (const item of order.items) {
          try {
            const parsed = await parseOrderItem(item.name);

            if (!parsed.soldProductId) {
              unmatchedItems.push(item.name);
              continue;
            }

            // Get cup size in ml from the sold product
            const sizeMl = parsed.sizeMl;
            const sizeTier = parsed.sizeTier;
            const cupWeightG = sizeMl ? (CUP_WEIGHTS[sizeMl] || sizeMl) : null;

            // --- Deduct complements and track total complement weight ---
            let totalComplementsG = 0;

            if (sizeTier && parsed.complementProductIds.length > 0) {
              for (const compProductId of parsed.complementProductIds) {
                const [gramage] = await db
                  .select()
                  .from(complementGramages)
                  .where(
                    and(
                      eq(complementGramages.productId, compProductId),
                      eq(complementGramages.sizeTier, sizeTier),
                    )
                  )
                  .limit(1);

                if (gramage) {
                  const compG = Number(gramage.quantityG);
                  totalComplementsG += compG;
                  const totalG = compG * item.quantity;
                  await deductProductStock(
                    compProductId,
                    totalG,
                    'daily_processing',
                    run.id,
                    'cron',
                  );
                }
              }
            }

            // --- Deduct açaí polpa: cup weight - complements ---
            if (acaiProductId && cupWeightG) {
              const polpaG = Math.max(cupWeightG - totalComplementsG, 0);
              if (polpaG > 0) {
                const totalPolpaG = polpaG * item.quantity;
                await deductProductStock(
                  acaiProductId,
                  totalPolpaG,
                  'daily_processing',
                  run.id,
                  'cron',
                );
              }
            }

            // Track unmatched fragments
            for (const frag of parsed.unmatchedFragments) {
              unmatchedItems.push(`${item.name} → "${frag}"`);
            }
          } catch (err: any) {
            orderErrors.push(`Item "${item.name}": ${err.message}`);
            errorCount++;
          }
        }

        // Mark order as processed
        await db.insert(processedOrders).values({
          orderId: order.id,
          date,
          itemCount: order.items.length,
          status: orderErrors.length > 0 ? 'partial' : 'ok',
          errors: orderErrors.length > 0 ? orderErrors.join('; ') : null,
        });

        ordersProcessed++;
        if (orderErrors.length > 0) {
          errorDetails.push(...orderErrors);
        }
      } catch (err: any) {
        errorCount++;
        errorDetails.push(`Order ${order.id}: ${err.message}`);
      }
    }

    // Update run record
    const status = errorCount > 0 && ordersProcessed === 0 ? 'failed' : 'completed';
    await db
      .update(dailyStockRuns)
      .set({
        completedAt: new Date(),
        ordersFetched,
        ordersProcessed,
        ordersSkipped,
        errors: errorCount,
        status,
        summary: {
          unmatchedItems: [...new Set(unmatchedItems)],
          errorDetails: errorDetails.slice(0, 50),
        },
      })
      .where(eq(dailyStockRuns.id, run.id));

    return {
      runId: run.id,
      date,
      ordersFetched,
      ordersProcessed,
      ordersSkipped,
      errors: errorCount,
      unmatchedItems: [...new Set(unmatchedItems)],
      errorDetails,
      status,
    };
  } catch (err: any) {
    await db
      .update(dailyStockRuns)
      .set({
        completedAt: new Date(),
        status: 'failed',
        summary: { error: err.message },
      })
      .where(eq(dailyStockRuns.id, run.id));

    throw err;
  }
}
