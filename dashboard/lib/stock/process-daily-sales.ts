import 'server-only';
import { db } from '@/lib/db';
import {
  products,
  complementGramages,
  processedOrders,
  dailyStockRuns,
  soldProducts,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { syncOrdersForDate } from '@/lib/sync-orders';
import { getLocalOrders } from '@/lib/local-orders';
import { parseOrderItem, clearParserCaches, mlToSizeTier } from './parse-order-item';
import { deductProductStock } from './deduct-stock';
import { getComplementsForItem, clearComplementCaches } from './extract-complements';
import type { UnifiedOrder } from '@/lib/types';

/** Acai product ID in the products table (the base polpa) */
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

async function getAcaiProductId(tenantId: number): Promise<number | null> {
  const [p] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.name, ACAI_PRODUCT_NAME), eq(products.tenantId, tenantId)))
    .limit(1);
  return p?.id ?? null;
}

export async function processDailySales(date: string, tenantId: number): Promise<RunResult> {
  clearParserCaches();
  clearComplementCaches();

  const [run] = await db.insert(dailyStockRuns).values({
    tenantId,
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
      await syncOrdersForDate(date, tenantId);
    } catch (err: any) {
      errorDetails.push(`Sync error: ${err.message}`);
    }

    // Step 2: Read from local DB
    const allOrders = await getLocalOrders(date, date, tenantId);
    const completedOrders = allOrders.filter(o => o.status === 'completed');
    const ordersFetched = completedOrders.length;

    // Get acai product ID once
    const acaiProductId = await getAcaiProductId(tenantId);

    // Build revenda alias set for skipping (no stock deduction needed)
    const revendaProducts = await db
      .select({ name: products.name, aliases: products.aliases })
      .from(products)
      .where(and(eq(products.category, 'revenda'), eq(products.tenantId, tenantId)));
    const revendaAliases = new Set<string>();
    for (const p of revendaProducts) {
      revendaAliases.add(p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());
      if (p.aliases) {
        for (const a of p.aliases.split(',')) {
          const norm = a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          if (norm) revendaAliases.add(norm);
        }
      }
    }

    // Build set of soldProduct categories that don't need stock deduction
    const noDeductCategories = new Set(['milkshake', 'sorvete']);
    const soldProductRows = await db.select({ id: soldProducts.id, category: soldProducts.category }).from(soldProducts).where(eq(soldProducts.tenantId, tenantId));
    const soldProductCategoryMap = new Map<number, string | null>();
    for (const sp of soldProductRows) {
      soldProductCategoryMap.set(sp.id, sp.category);
    }

    function isRevendaItem(itemName: string): boolean {
      const norm = itemName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
      if (revendaAliases.has(norm)) return true;
      for (const alias of revendaAliases) {
        if (norm.includes(alias) || alias.includes(norm)) return true;
      }
      return false;
    }

    // Process each order
    for (const order of completedOrders) {
      try {
        // Skip if already processed
        const [existing] = await db
          .select()
          .from(processedOrders)
          .where(and(eq(processedOrders.orderId, order.id), eq(processedOrders.tenantId, tenantId)))
          .limit(1);

        if (existing) {
          ordersSkipped++;
          continue;
        }

        let orderErrors: string[] = [];

        for (let itemIdx = 0; itemIdx < order.items.length; itemIdx++) {
          const item = order.items[itemIdx];
          try {
            const parsed = await parseOrderItem(item.name, tenantId);

            if (!parsed.soldProductId) {
              // Revenda items don't need stock deduction -- skip silently
              if (!isRevendaItem(item.name)) {
                unmatchedItems.push(item.name);
              }
              continue;
            }

            // Milkshakes and sorvete don't have ingredient recipes for stock deduction
            const spCategory = soldProductCategoryMap.get(parsed.soldProductId);
            if (spCategory && noDeductCategories.has(spCategory)) {
              continue;
            }

            // Get cup size in ml from the sold product
            const sizeMl = parsed.sizeMl;
            const sizeTier = parsed.sizeTier;
            const cupWeightG = sizeMl ? (CUP_WEIGHTS[sizeMl] || sizeMl) : null;

            // --- Extract complements from raw_data (not from item name) ---
            const { complementProductIds, unmatchedNames } = await getComplementsForItem(
              order.rawData,
              order.channel,
              itemIdx,
              tenantId,
            );

            // --- Deduct complements and track total complement weight ---
            let totalComplementsG = 0;

            if (sizeTier && complementProductIds.length > 0) {
              for (const compProductId of complementProductIds) {
                const [gramage] = await db
                  .select()
                  .from(complementGramages)
                  .where(
                    and(
                      eq(complementGramages.productId, compProductId),
                      eq(complementGramages.sizeTier, sizeTier),
                      eq(complementGramages.tenantId, tenantId),
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
                    tenantId,
                    run.id,
                    'cron',
                  );
                }
              }
            }

            // --- Deduct acai polpa: cup weight - complements ---
            if (acaiProductId && cupWeightG) {
              const polpaG = Math.max(cupWeightG - totalComplementsG, 0);
              if (polpaG > 0) {
                const totalPolpaG = polpaG * item.quantity;
                await deductProductStock(
                  acaiProductId,
                  totalPolpaG,
                  'daily_processing',
                  tenantId,
                  run.id,
                  'cron',
                );
              }
            }

            // Track unmatched complement names
            for (const name of unmatchedNames) {
              unmatchedItems.push(`${item.name} → complemento "${name}"`);
            }
          } catch (err: any) {
            orderErrors.push(`Item "${item.name}": ${err.message}`);
            errorCount++;
          }
        }

        // Mark order as processed
        await db.insert(processedOrders).values({
          tenantId,
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
