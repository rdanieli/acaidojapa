import { db } from '@/lib/db';
import { inventoryEntries, inventoryItems, products, stockMovements, pendingAdminCommands } from '@/lib/db/schema';
import { eq, and, desc, lt, sql } from 'drizzle-orm';
import { sendMessage } from './evolution';
import { convertToGrams } from '@/lib/stock/convert-units';
import { checkAndCreateAlerts } from '@/lib/stock/check-alerts';
import { addBotResponseToHistory } from './admin-commands';

const CONFIRM_WORDS = ['ok', 'sim', 'confirma', 'confirmar', 'confirmado', 'certo'];
const REJECT_WORDS = ['cancelar', 'cancela', 'nao', 'não', 'n', 'errado'];

export async function handleConfirmation(phone: string, text: string, tenantId?: number): Promise<boolean> {
  const normalized = text.trim().toLowerCase();

  const isConfirm = CONFIRM_WORDS.some((w) => normalized === w || normalized.startsWith(w));
  const isReject = REJECT_WORDS.some((w) => normalized === w || normalized.startsWith(w));

  if (!isConfirm && !isReject) return false;

  // --- Check for pending admin command first ---
  const adminConditions = [
    eq(pendingAdminCommands.senderPhone, phone),
    eq(pendingAdminCommands.status, 'pending'),
  ];
  if (tenantId != null) adminConditions.push(eq(pendingAdminCommands.tenantId, tenantId));

  const [pendingAdmin] = await db.select().from(pendingAdminCommands)
    .where(and(...adminConditions))
    .orderBy(desc(pendingAdminCommands.createdAt))
    .limit(1);

  if (pendingAdmin) {
    const effTenant = tenantId ?? pendingAdmin.tenantId;

    if (isReject) {
      await db.update(pendingAdminCommands)
        .set({ status: 'canceled', confirmedAt: new Date() })
        .where(eq(pendingAdminCommands.id, pendingAdmin.id));
      const msg = `❌ Ajuste de *${pendingAdmin.productName}* cancelado.`;
      await sendMessage(phone, msg, effTenant);
      addBotResponseToHistory(phone, msg);
      return true;
    }

    // Confirm: apply the change
    const newValue = Number(pendingAdmin.newValue);
    const oldValue = pendingAdmin.oldValue ? Number(pendingAdmin.oldValue) : 0;

    if (pendingAdmin.commandType === 'adjust_stock') {
      const difference = newValue - oldValue;
      await db.update(products)
        .set({ currentStock: String(newValue) })
        .where(and(eq(products.id, pendingAdmin.productId), eq(products.tenantId, effTenant)));

      await db.insert(stockMovements).values({
        tenantId: effTenant,
        productId: pendingAdmin.productId,
        type: 'ajuste',
        quantity: String(difference),
        unit: pendingAdmin.unit || 'g',
        notes: `Ajuste via WhatsApp confirmado: ${oldValue} → ${newValue}`,
        createdBy: phone,
      });

      const msg = `✅ *${pendingAdmin.productName}* ajustado!\n\nAntes: ${oldValue} ${pendingAdmin.unit || ''}\nAgora: ${newValue} ${pendingAdmin.unit || ''}\nDiferença: ${difference > 0 ? '+' : ''}${difference}`;
      await sendMessage(phone, msg, effTenant);
      addBotResponseToHistory(phone, msg);
    } else if (pendingAdmin.commandType === 'set_cost') {
      await db.update(products)
        .set({ costPerUnit: String(newValue) })
        .where(and(eq(products.id, pendingAdmin.productId), eq(products.tenantId, effTenant)));

      const msg = `✅ Custo de *${pendingAdmin.productName}* atualizado!\n\n${oldValue > 0 ? `Antes: R$ ${oldValue.toFixed(2)}` : 'Antes: não definido'}\nAgora: R$ ${newValue.toFixed(2)}`;
      await sendMessage(phone, msg, effTenant);
      addBotResponseToHistory(phone, msg);
    }

    await db.update(pendingAdminCommands)
      .set({ status: 'confirmed', confirmedAt: new Date() })
      .where(eq(pendingAdminCommands.id, pendingAdmin.id));

    return true;
  }

  // Find latest pending entry from this phone
  const pendingConditions = [
    eq(inventoryEntries.senderPhone, phone),
    eq(inventoryEntries.status, 'pending'),
  ];
  if (tenantId != null) pendingConditions.push(eq(inventoryEntries.tenantId, tenantId));

  const [pending] = await db
    .select()
    .from(inventoryEntries)
    .where(and(...pendingConditions))
    .orderBy(desc(inventoryEntries.createdAt))
    .limit(1);

  if (!pending) {
    await sendMessage(phone, 'Nenhuma entrada pendente encontrada.', tenantId);
    return true;
  }

  const effectiveTenantId = tenantId ?? pending.tenantId;

  if (isConfirm) {
    await db
      .update(inventoryEntries)
      .set({ status: 'confirmed', confirmedAt: new Date() })
      .where(eq(inventoryEntries.id, pending.id));

    const items = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.entryId, pending.id));

    // Update stock for each matched product
    for (const item of items) {
      if (!item.productId) continue;

      const qty = Number(item.quantity) || 0;
      if (qty <= 0) continue;

      // Get product for unit conversion
      const [product] = await db.select().from(products).where(and(eq(products.id, item.productId), eq(products.tenantId, effectiveTenantId)));
      if (!product) continue;

      let stockIncrement: number;

      if (item.unit.toLowerCase() === product.defaultUnit.toLowerCase()) {
        // Same unit -- direct addition
        stockIncrement = qty;
      } else {
        // Different units -- convert through grams
        const unitWeightG = product.unitWeightG ? Number(product.unitWeightG) : null;
        const inGrams = convertToGrams(qty, item.unit, unitWeightG);
        if (inGrams == null) {
          console.warn(`[Stock] Cannot convert ${qty} ${item.unit} to ${product.defaultUnit} for product ${product.id}`);
          stockIncrement = qty;
        } else {
          const { convertFromGrams } = await import('@/lib/stock/convert-units');
          const converted = convertFromGrams(inGrams, product.defaultUnit, unitWeightG);
          stockIncrement = converted ?? qty;
        }
      }

      // Update currentStock and costPerUnit
      const totalPrice = item.totalPrice ? Number(item.totalPrice) : null;
      const costPerUnit = totalPrice != null && stockIncrement > 0
        ? String((totalPrice / stockIncrement).toFixed(2))
        : undefined;

      await db
        .update(products)
        .set({
          currentStock: sql`${products.currentStock}::numeric + ${String(stockIncrement)}::numeric`,
          ...(costPerUnit != null ? { costPerUnit } : {}),
        })
        .where(and(eq(products.id, item.productId), eq(products.tenantId, effectiveTenantId)));

      // Create stock movement
      const unitWeightG = product.unitWeightG ? Number(product.unitWeightG) : null;
      const quantityG = convertToGrams(qty, item.unit, unitWeightG);

      await db.insert(stockMovements).values({
        tenantId: effectiveTenantId,
        productId: item.productId,
        type: 'entrada',
        quantity: String(qty),
        unit: item.unit,
        quantityG: quantityG != null ? String(quantityG) : null,
        referenceType: 'inventory_entry',
        referenceId: pending.id,
        createdBy: phone,
      });

      // Check alerts
      await checkAndCreateAlerts(item.productId, effectiveTenantId);
    }

    const summary = items.map((i) => `  - ${i.productName}: ${i.quantity} ${i.unit}`).join('\n');
    await sendMessage(phone, `Entrada #${pending.id} confirmada!\n\n${summary}`, effectiveTenantId);
  } else {
    await db
      .update(inventoryEntries)
      .set({ status: 'rejected' })
      .where(eq(inventoryEntries.id, pending.id));

    await sendMessage(phone, `Entrada #${pending.id} cancelada.`, effectiveTenantId);
  }

  return true;
}

export async function expirePendingEntries(tenantId?: number): Promise<void> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const conditions = [
    eq(inventoryEntries.status, 'pending'),
    lt(inventoryEntries.createdAt, twentyFourHoursAgo),
  ];
  if (tenantId != null) conditions.push(eq(inventoryEntries.tenantId, tenantId));

  await db
    .update(inventoryEntries)
    .set({ status: 'expired' })
    .where(and(...conditions));
}
