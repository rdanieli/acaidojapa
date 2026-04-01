import { db } from '@/lib/db';
import { orders, orderItems, products, stockMovements, inventoryEntries, inventoryItems, ingestEvents } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

const VALID_EVENTS = ['order.completed', 'order.canceled', 'inventory.received', 'inventory.adjusted', 'product.created', 'product.updated'];

export async function processEvent(eventId: number): Promise<void> {
  const [event] = await db.select().from(ingestEvents).where(eq(ingestEvents.id, eventId)).limit(1);
  if (!event || event.status !== 'pending') return;

  await db.update(ingestEvents).set({ status: 'processing' }).where(eq(ingestEvents.id, eventId));

  try {
    const payload = event.payload as any;
    const tenantId = event.tenantId;

    switch (event.event) {
      case 'order.completed':
      case 'order.canceled':
        await processOrder(tenantId, event.event, payload);
        break;
      case 'inventory.received':
        await processInventoryReceived(tenantId, payload);
        break;
      case 'inventory.adjusted':
        await processInventoryAdjusted(tenantId, payload);
        break;
      case 'product.created':
        await processProductCreated(tenantId, payload);
        break;
      case 'product.updated':
        await processProductUpdated(tenantId, payload);
        break;
      default:
        throw new Error(`Unknown event: ${event.event}`);
    }

    await db.update(ingestEvents).set({ status: 'completed', processedAt: new Date() }).where(eq(ingestEvents.id, eventId));
  } catch (err: any) {
    await db.update(ingestEvents).set({ status: 'failed', error: err.message, processedAt: new Date() }).where(eq(ingestEvents.id, eventId));
    throw err;
  }
}

async function processOrder(tenantId: number, event: string, data: any) {
  const externalId = data.externalId || `api-${Date.now()}`;
  const status = event === 'order.canceled' ? 'canceled' : (data.status || 'completed');
  const datetime = data.datetime || new Date().toISOString();
  const date = datetime.split('T')[0];
  const total = Number(data.total) || 0;
  const items = data.items || [];
  const payments = data.payments || [];

  // Check if order exists (for cancel events)
  if (event === 'order.canceled') {
    await db.update(orders).set({ status: 'canceled' })
      .where(and(eq(orders.externalId, externalId), eq(orders.tenantId, tenantId)));
    return;
  }

  // Insert order (skip if exists)
  const [existing] = await db.select({ id: orders.id }).from(orders)
    .where(and(eq(orders.externalId, externalId), eq(orders.tenantId, tenantId))).limit(1);
  if (existing) return;

  const [order] = await db.insert(orders).values({
    tenantId,
    externalId,
    channel: 'api',
    displayId: data.displayId || externalId,
    datetime: new Date(datetime),
    date,
    total: String(total),
    status,
    orderType: data.orderType || 'balcao',
    salesChannel: data.salesChannel || null,
    paymentsJson: payments,
    rawData: data,
  }).returning();

  // Insert items
  for (const item of items) {
    await db.insert(orderItems).values({
      tenantId,
      orderId: order.id,
      name: item.name || 'Produto',
      quantity: String(item.quantity || 1),
      unitPrice: String(item.unitPrice || 0),
      totalPrice: String((item.quantity || 1) * (item.unitPrice || 0)),
    });
  }
}

async function processInventoryReceived(tenantId: number, data: any) {
  const items = data.items || [];
  if (items.length === 0) return;

  // Create inventory entry
  const [entry] = await db.insert(inventoryEntries).values({
    tenantId,
    source: 'api',
    rawText: JSON.stringify(data),
    senderPhone: 'api',
    status: 'confirmed',
    confirmedAt: new Date(),
  }).returning();

  for (const item of items) {
    const name = item.productName || item.name;
    const qty = Number(item.quantity) || 0;
    const unit = item.unit || 'un';
    const unitPrice = item.unitPrice ? Number(item.unitPrice) : null;

    // Find or create product
    let [product] = await db.select().from(products)
      .where(and(eq(products.tenantId, tenantId), sql`lower(${products.name}) = lower(${name})`))
      .limit(1);

    if (!product) {
      [product] = await db.insert(products).values({
        tenantId, name, defaultUnit: unit,
      }).returning();
    }

    // Insert inventory item
    await db.insert(inventoryItems).values({
      tenantId,
      entryId: entry.id,
      productId: product.id,
      productName: name,
      quantity: String(qty),
      unit,
      unitPrice: unitPrice != null ? String(unitPrice) : null,
      totalPrice: unitPrice != null ? String(qty * unitPrice) : null,
    });

    // Update stock
    await db.update(products)
      .set({ currentStock: sql`CAST(${products.currentStock} AS numeric) + ${qty}` })
      .where(eq(products.id, product.id));

    // Record movement
    await db.insert(stockMovements).values({
      tenantId,
      productId: product.id,
      type: 'entrada',
      quantity: String(qty),
      unit,
      referenceType: 'ingest_api',
      referenceId: entry.id,
      createdBy: 'api',
    });
  }
}

async function processInventoryAdjusted(tenantId: number, data: any) {
  const name = data.productName || data.name;
  const newQuantity = Number(data.quantity);
  const unit = data.unit || 'g';

  const [product] = await db.select().from(products)
    .where(and(eq(products.tenantId, tenantId), sql`lower(${products.name}) = lower(${name})`))
    .limit(1);

  if (!product) throw new Error(`Product not found: ${name}`);

  const currentStock = Number(product.currentStock) || 0;
  const difference = newQuantity - currentStock;

  await db.update(products).set({ currentStock: String(newQuantity) }).where(eq(products.id, product.id));
  await db.insert(stockMovements).values({
    tenantId,
    productId: product.id,
    type: 'ajuste',
    quantity: String(difference),
    unit,
    notes: `Ajuste via Ingest API: ${currentStock} → ${newQuantity}`,
    createdBy: 'api',
  });
}

async function processProductCreated(tenantId: number, data: any) {
  const name = data.name;
  if (!name) throw new Error('Product name required');

  await db.insert(products).values({
    tenantId,
    name,
    defaultUnit: data.unit || 'un',
    category: data.category || null,
    costPerUnit: data.costPerUnit != null ? String(data.costPerUnit) : null,
  });
}

async function processProductUpdated(tenantId: number, data: any) {
  const name = data.name;
  if (!name) throw new Error('Product name required');

  const [product] = await db.select().from(products)
    .where(and(eq(products.tenantId, tenantId), sql`lower(${products.name}) = lower(${name})`))
    .limit(1);

  if (!product) throw new Error(`Product not found: ${name}`);

  const updates: any = {};
  if (data.unit) updates.defaultUnit = data.unit;
  if (data.category) updates.category = data.category;
  if (data.costPerUnit != null) updates.costPerUnit = String(data.costPerUnit);
  if (data.newName) updates.name = data.newName;

  if (Object.keys(updates).length > 0) {
    await db.update(products).set(updates).where(eq(products.id, product.id));
  }
}

export { VALID_EVENTS };
