import 'server-only';
import { db } from '@/lib/db';
import { orders, orderItems } from '@/lib/db/schema';
import { eq, desc, sql, inArray } from 'drizzle-orm';
import { getCuponsForRange, cwGetOrdersHistory, cwGetOrder } from '@/lib/apis';
import { normalizePdvCupom, normalizeCwOrder } from '@/lib/normalize';
import { formatDateISO } from '@/lib/format';
import type { UnifiedOrder } from '@/lib/types';

interface SyncResult {
  date: string;
  pdvFetched: number;
  cwFetched: number;
  imported: number;
  skipped: number;
  errors: string[];
}

async function insertOrder(unified: UnifiedOrder, raw: any, date: string): Promise<boolean> {
  try {
    const dt = unified.datetime ? new Date(unified.datetime) : new Date(`${date}T12:00:00-03:00`);

    const [order] = await db.insert(orders).values({
      externalId: unified.id,
      channel: unified.channel,
      displayId: unified.displayId,
      datetime: dt,
      date,
      total: String(unified.total),
      status: unified.status,
      orderType: unified.orderType,
      salesChannel: unified.salesChannel || null,
      paymentsJson: unified.payments,
      rawData: raw,
    }).onConflictDoNothing().returning();

    if (!order) return false; // already existed

    if (unified.items.length > 0) {
      await db.insert(orderItems).values(
        unified.items.map(item => ({
          orderId: order.id,
          name: item.name,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          totalPrice: String(item.totalPrice),
        }))
      );
    }
    return true;
  } catch (err: any) {
    if (err.code === '23505') return false;
    throw err;
  }
}

/**
 * Sync orders from external APIs into local DB for a single date.
 * PDV: bulk fetch (fast). CW: fetch history list first, then only missing details.
 */
export async function syncOrdersForDate(date: string): Promise<SyncResult> {
  const errors: string[] = [];
  let pdvFetched = 0;
  let cwFetched = 0;
  let imported = 0;
  let skipped = 0;

  // --- PDV (fast — single bulk API call) ---
  try {
    const pdvCupons = await getCuponsForRange(date, date);
    if (Array.isArray(pdvCupons)) {
      pdvFetched = pdvCupons.length;
      for (const cupom of pdvCupons) {
        const unified = normalizePdvCupom(cupom);
        const wasInserted = await insertOrder(unified, cupom, date);
        if (wasInserted) imported++; else skipped++;
      }
    }
  } catch (err: any) {
    errors.push(`PDV: ${err.message}`);
  }

  // --- CW (smart — check which orders we already have) ---
  try {
    const historyResult = await cwGetOrdersHistory(date, date);
    const historyOrders = historyResult?.orders || [];
    cwFetched = historyOrders.length;

    if (historyOrders.length > 0) {
      // Check which CW orders we already have
      const cwExternalIds = historyOrders.map((o: any) => `cw-${o.id}`);
      const existingRows = await db
        .select({ externalId: orders.externalId })
        .from(orders)
        .where(inArray(orders.externalId, cwExternalIds));
      const existingSet = new Set(existingRows.map(r => r.externalId));

      // Only fetch details for missing orders
      for (const summary of historyOrders) {
        const externalId = `cw-${summary.id}`;
        if (existingSet.has(externalId)) {
          skipped++;
          continue;
        }

        try {
          const detail = await cwGetOrder(summary.id);
          const unified = normalizeCwOrder(detail);
          const wasInserted = await insertOrder(unified, detail, date);
          if (wasInserted) imported++; else skipped++;
        } catch (err: any) {
          errors.push(`CW order ${summary.id}: ${err.message}`);
        }
      }
    }
  } catch (err: any) {
    errors.push(`CW: ${err.message}`);
  }

  return { date, pdvFetched, cwFetched, imported, skipped, errors };
}

/**
 * Sync orders for a date range. Processes day by day.
 */
export async function syncOrdersForRange(start: string, end: string): Promise<{
  totalImported: number;
  totalSkipped: number;
  days: SyncResult[];
}> {
  const results: SyncResult[] = [];
  let totalImported = 0;
  let totalSkipped = 0;

  const startDate = new Date(start + 'T12:00:00');
  const endDate = new Date(end + 'T12:00:00');

  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = formatDateISO(current);
    const result = await syncOrdersForDate(dateStr);
    results.push(result);
    totalImported += result.imported;
    totalSkipped += result.skipped;
    current.setDate(current.getDate() + 1);
  }

  return { totalImported, totalSkipped, days: results };
}

/**
 * Get the last synced date from the database.
 */
export async function getLastSyncDate(): Promise<string | null> {
  const [latest] = await db
    .select({ date: orders.date })
    .from(orders)
    .orderBy(desc(orders.date))
    .limit(1);
  return latest?.date ?? null;
}
