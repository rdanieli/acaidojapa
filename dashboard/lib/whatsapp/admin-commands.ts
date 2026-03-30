/**
 * WhatsApp admin commands for stock adjustments and product updates.
 *
 * Commands:
 *   "ajuste estoque {produto} para {quantidade}{unidade}"
 *   "ajustar estoque {produto} {quantidade}{unidade}"
 *   "preço {produto} {valor}"
 *   "custo {produto} {valor}"
 *   "valor kg {produto} {valor}"
 */

import { db } from '@/lib/db';
import { products, stockMovements } from '@/lib/db/schema';
import { eq, and, sql, ilike } from 'drizzle-orm';
import { sendMessage } from '@/lib/whatsapp/evolution';

/**
 * Try to handle the message as an admin command.
 * Returns true if it was a command and was handled.
 */
export async function handleAdminCommand(
  phone: string,
  text: string,
  tenantId: number,
): Promise<boolean> {
  const normalized = text.trim().toLowerCase();

  // --- Adjust stock ---
  // "ajuste estoque leite ninho para 1500g"
  // "ajustar estoque leite ninho 1500g"
  // "estoque leite ninho = 1500g"
  const stockMatch = normalized.match(
    /(?:ajust(?:e|ar)\s+estoque|estoque)\s+(.+?)\s+(?:para|=|:)\s*([\d.,]+)\s*(g|kg|un|l|ml|cx|pct)?/i
  );

  if (stockMatch) {
    const productName = stockMatch[1].trim();
    const quantity = parseNumber(stockMatch[2]);
    const unit = stockMatch[3] || 'g';
    return await adjustStock(phone, tenantId, productName, quantity, unit);
  }

  // --- Set price/cost ---
  // "preço leite ninho 25.90"
  // "custo leite ninho 25.90"
  // "valor kg polpa de açaí 22.50"
  // "custo kg granola 15"
  const priceMatch = normalized.match(
    /(?:pre[cç]o|custo|valor)\s*(?:kg|un|l)?\s+(.+?)\s+([\d.,]+)/i
  );

  if (priceMatch) {
    const productName = priceMatch[1].trim();
    const value = parseNumber(priceMatch[2]);
    return await setCost(phone, tenantId, productName, value);
  }

  return false;
}

function parseNumber(str: string): number {
  // Handle Brazilian format: 1.500,50 → 1500.50
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

async function findProduct(tenantId: number, name: string) {
  // Try exact match first
  let [product] = await db.select().from(products)
    .where(and(eq(products.tenantId, tenantId), ilike(products.name, name)))
    .limit(1);

  if (product) return product;

  // Try partial match
  [product] = await db.select().from(products)
    .where(and(eq(products.tenantId, tenantId), ilike(products.name, `%${name}%`)))
    .limit(1);

  return product || null;
}

async function adjustStock(
  phone: string,
  tenantId: number,
  productName: string,
  newQuantity: number,
  unit: string,
): Promise<boolean> {
  const product = await findProduct(tenantId, productName);

  if (!product) {
    await sendMessage(phone, `❌ Produto "${productName}" não encontrado.`, tenantId);
    return true;
  }

  const currentStock = Number(product.currentStock) || 0;
  const difference = newQuantity - currentStock;

  // Update stock directly
  await db.update(products)
    .set({ currentStock: String(newQuantity) })
    .where(eq(products.id, product.id));

  // Record movement
  await db.insert(stockMovements).values({
    tenantId,
    productId: product.id,
    type: 'ajuste',
    quantity: String(difference),
    unit: unit || product.defaultUnit,
    notes: `Ajuste via WhatsApp: ${currentStock} → ${newQuantity}`,
    createdBy: phone,
  });

  await sendMessage(
    phone,
    `✅ *${product.name}* ajustado!\n\nAntes: ${currentStock} ${product.defaultUnit}\nAgora: ${newQuantity} ${unit || product.defaultUnit}\nDiferença: ${difference > 0 ? '+' : ''}${difference}`,
    tenantId,
  );

  return true;
}

async function setCost(
  phone: string,
  tenantId: number,
  productName: string,
  value: number,
): Promise<boolean> {
  const product = await findProduct(tenantId, productName);

  if (!product) {
    await sendMessage(phone, `❌ Produto "${productName}" não encontrado.`, tenantId);
    return true;
  }

  const oldCost = product.costPerUnit ? Number(product.costPerUnit) : null;

  await db.update(products)
    .set({ costPerUnit: String(value) })
    .where(eq(products.id, product.id));

  await sendMessage(
    phone,
    `✅ Custo de *${product.name}* atualizado!\n\n${oldCost ? `Antes: R$ ${oldCost.toFixed(2)}` : 'Antes: não definido'}\nAgora: R$ ${value.toFixed(2)} por ${product.defaultUnit}`,
    tenantId,
  );

  return true;
}
