import 'server-only';
import { db } from '@/lib/db';
import { orders, orderItems } from '@/lib/db/schema';
import { and, gte, lte, eq, desc, sql, inArray } from 'drizzle-orm';
import type { UnifiedOrder, UnifiedItem, UnifiedPayment } from '@/lib/types';

function toUnifiedOrder(
  o: typeof orders.$inferSelect,
  items: (typeof orderItems.$inferSelect)[],
): UnifiedOrder {
  const unifiedItems: UnifiedItem[] = items.map(i => ({
    name: i.name,
    quantity: Number(i.quantity),
    totalPrice: Number(i.totalPrice),
    unitPrice: Number(i.unitPrice),
  }));

  const payments: UnifiedPayment[] = Array.isArray(o.paymentsJson)
    ? (o.paymentsJson as any[]).map(p => ({
        method: p.method || 'Outros',
        amount: p.amount || 0,
      }))
    : [];

  return {
    id: o.externalId,
    channel: o.channel as 'pdv' | 'online',
    displayId: o.displayId || '',
    datetime: o.datetime.toISOString(),
    total: Number(o.total),
    status: o.status as 'completed' | 'canceled',
    orderType: (o.orderType || 'balcao') as UnifiedOrder['orderType'],
    salesChannel: o.salesChannel || undefined,
    items: unifiedItems,
    payments,
  };
}

/**
 * Get orders from local DB for a date range, optionally filtered by channel.
 * Uses efficient batch loading of items.
 */
export async function getLocalOrders(
  start: string,
  end: string,
  channel?: string | null,
): Promise<UnifiedOrder[]> {
  const conditions = [
    gte(orders.date, start),
    lte(orders.date, end),
  ];
  if (channel === 'pdv') conditions.push(eq(orders.channel, 'pdv'));
  if (channel === 'online') conditions.push(eq(orders.channel, 'online'));

  const dbOrders = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.datetime));

  if (dbOrders.length === 0) return [];

  // Batch-load all items in one query
  const orderIds = dbOrders.map(o => o.id);
  const allItems = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds));

  // Group items by orderId
  const itemsByOrder = new Map<number, (typeof orderItems.$inferSelect)[]>();
  for (const item of allItems) {
    const arr = itemsByOrder.get(item.orderId);
    if (arr) arr.push(item);
    else itemsByOrder.set(item.orderId, [item]);
  }

  return dbOrders.map(o => toUnifiedOrder(o, itemsByOrder.get(o.id) || []));
}

/**
 * Get a single order by its external ID (e.g., "pdv-123" or "cw-456").
 */
export async function getLocalOrderById(externalId: string): Promise<UnifiedOrder | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.externalId, externalId))
    .limit(1);

  if (!order) return null;

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  return toUnifiedOrder(order, items);
}

/**
 * Check if we have local data for a date range.
 */
export async function hasLocalData(start: string, end: string): Promise<boolean> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(and(gte(orders.date, start), lte(orders.date, end)));
  return (result?.count || 0) > 0;
}
