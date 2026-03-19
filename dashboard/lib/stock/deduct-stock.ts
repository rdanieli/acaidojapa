import { db } from '@/lib/db';
import { products, stockMovements } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { convertFromGrams } from './convert-units';
import { checkAndCreateAlerts } from './check-alerts';

/**
 * Deduct stock for a product by grams.
 * Converts grams to the product's default unit, creates a stock movement,
 * and updates currentStock.
 */
export async function deductProductStock(
  productId: number,
  quantityG: number,
  referenceType: string,
  referenceId?: number,
  createdBy?: string,
) {
  const [product] = await db.select().from(products).where(eq(products.id, productId));
  if (!product) return null;

  const unitWeightG = product.unitWeightG ? Number(product.unitWeightG) : null;
  const stockDeduction = convertFromGrams(quantityG, product.defaultUnit, unitWeightG) ?? (quantityG / 1000);

  const [movement] = await db.insert(stockMovements).values({
    productId,
    type: 'saida_venda',
    quantity: String(stockDeduction),
    unit: product.defaultUnit,
    quantityG: String(quantityG),
    referenceType,
    referenceId: referenceId ?? null,
    createdBy: createdBy ?? 'system',
  }).returning();

  await db
    .update(products)
    .set({
      currentStock: sql`GREATEST(${products.currentStock}::numeric - ${String(stockDeduction)}::numeric, 0)`,
    })
    .where(eq(products.id, productId));

  await checkAndCreateAlerts(productId);

  return movement;
}
