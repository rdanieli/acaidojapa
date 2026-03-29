import { db } from '@/lib/db';
import { products, stockAlerts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function checkAndCreateAlerts(productId: number, tenantId?: number): Promise<void> {
  const conditions = [eq(products.id, productId)];
  if (tenantId != null) conditions.push(eq(products.tenantId, tenantId));

  const [product] = await db.select().from(products).where(and(...conditions));
  if (!product || !product.active) return;

  const effectiveTenantId = tenantId ?? product.tenantId;
  const currentStock = Number(product.currentStock) || 0;
  const minStock = product.minStock ? Number(product.minStock) : null;

  // Resolve existing active alerts if stock is now above threshold
  if (minStock != null && currentStock > minStock) {
    await db
      .update(stockAlerts)
      .set({ status: 'resolved', resolvedAt: new Date() })
      .where(
        and(
          eq(stockAlerts.productId, productId),
          eq(stockAlerts.status, 'active'),
          eq(stockAlerts.tenantId, effectiveTenantId)
        )
      );
    return;
  }

  // Determine alert type
  let alertType: 'out_of_stock' | 'low_stock' | null = null;
  if (currentStock <= 0) {
    alertType = 'out_of_stock';
  } else if (minStock != null && currentStock <= minStock) {
    alertType = 'low_stock';
  }

  if (!alertType) return;

  // Check if there's already an active alert of this type for this product
  const [existing] = await db
    .select()
    .from(stockAlerts)
    .where(
      and(
        eq(stockAlerts.productId, productId),
        eq(stockAlerts.alertType, alertType),
        eq(stockAlerts.status, 'active'),
        eq(stockAlerts.tenantId, effectiveTenantId)
      )
    )
    .limit(1);

  if (existing) return; // Already has an active alert

  // Create new alert
  await db.insert(stockAlerts).values({
    tenantId: effectiveTenantId,
    productId,
    alertType,
    currentStock: String(currentStock),
    minStock: minStock != null ? String(minStock) : null,
  });
}
