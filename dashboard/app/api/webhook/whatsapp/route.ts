import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventoryEntries, inventoryItems, allowedSenders, products, stockMovements, tenants, tenantSettings } from '@/lib/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import {
  transcribeAudio,
  extractInventoryFromText,
  extractInventoryFromImage,
} from '@/lib/whatsapp/ai-processor';
import { downloadMedia, sendMessage } from '@/lib/whatsapp/evolution';
import { handleConfirmation } from '@/lib/whatsapp/confirmation';
import { phoneVariants } from '@/lib/whatsapp/phone';
import { ownerSelfMessagePhone } from '@/lib/whatsapp/self-chat';
import { wasSentByUs } from '@/lib/whatsapp/sent-messages';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const VERIFY_WORDS = ['verificar', 'verify', 'ativar'];

/**
 * Resolve tenantId from the Evolution instance name. Checks the name saved in
 * tenantSettings first (covers legacy names like 'acaidojapa') and falls back
 * to the tongo-{slug} convention. Returns null when it cannot be resolved.
 */
async function resolveTenantFromInstance(instanceName: string | null): Promise<number | null> {
  if (!instanceName) return null;

  const [settings] = await db.select({ tenantId: tenantSettings.tenantId }).from(tenantSettings)
    .where(eq(tenantSettings.evolutionInstanceName, instanceName)).limit(1);
  if (settings) return settings.tenantId;

  const slug = instanceName.startsWith('tongo-') ? instanceName.slice(6) : null;
  if (!slug) return null;
  const [tenant] = await db.select({ id: tenants.id }).from(tenants)
    .where(eq(tenants.slug, slug)).limit(1);
  return tenant?.id ?? null;
}

function extractPhone(data: any): string {
  const remoteJid = data?.data?.key?.remoteJid || data?.data?.remoteJid || '';
  return remoteJid.replace(/@.*/, '');
}

function isGroupMessage(data: any): boolean {
  return (data?.data?.key?.remoteJid || '').includes('@g.us');
}

function isFromMe(data: any): boolean {
  return data?.data?.key?.fromMe === true;
}

/**
 * Handle verification: when someone replies "VERIFICAR", activate their access.
 * Matches by phone when the message carries one, falling back to the tenant's
 * single pending sender when it arrives as a LID.
 * Returns true if the message was a verification attempt.
 */
async function handleVerification(
  senderId: string,
  isLid: boolean,
  text: string,
  scopeTenantId: number | null
): Promise<boolean> {
  const normalized = text.trim().toLowerCase();
  if (!VERIFY_WORDS.some((w) => normalized === w || normalized.startsWith(w))) {
    return false;
  }

  const conditions = [eq(allowedSenders.verificationStatus, 'pending')];
  if (scopeTenantId) conditions.push(eq(allowedSenders.tenantId, scopeTenantId));
  const pendingSenders = await db.select().from(allowedSenders).where(and(...conditions));
  if (pendingSenders.length === 0) return false;

  const variants = phoneVariants(senderId);
  const target = isLid
    ? pendingSenders[0]
    : pendingSenders.find((s) => phoneVariants(s.phone).some((v) => variants.includes(v)));
  if (!target) return false;

  await db
    .update(allowedSenders)
    .set({ verificationStatus: 'verified', ...(isLid ? { lid: senderId } : {}) })
    .where(eq(allowedSenders.id, target.id));

  await sendMessage(
    target.phone,
    `Verificado! ${target.name}, seu acesso está ativo. Agora você pode enviar mensagens com itens de estoque ou fotos de notas fiscais.`,
    target.tenantId
  );

  console.log(`[Webhook] Verified sender: ${target.name} (${target.phone}) via ${isLid ? 'LID' : 'phone'} ${senderId}`);
  return true;
}

/**
 * Look up sender by LID or phone in the allowed_senders table.
 * Only returns verified + active senders.
 * Also returns the tenantId.
 */
async function lookupSender(phone: string, isLid: boolean, scopeTenantId?: number | null): Promise<{ replyPhone: string; senderName: string; tenantId: number } | null> {
  if (!scopeTenantId) return null;

  if (isLid) {
    const conditions = [eq(allowedSenders.lid, phone)];
    if (scopeTenantId) conditions.push(eq(allowedSenders.tenantId, scopeTenantId));
    const [byLid] = await db
      .select()
      .from(allowedSenders)
      .where(and(...conditions))
      .limit(1);
    if (byLid && byLid.active && byLid.verificationStatus === 'verified') {
      return { replyPhone: byLid.phone, senderName: byLid.name, tenantId: byLid.tenantId };
    }
    return null;
  }

  const conditions = [inArray(allowedSenders.phone, phoneVariants(phone))];
  if (scopeTenantId) conditions.push(eq(allowedSenders.tenantId, scopeTenantId));
  const [byPhone] = await db
    .select()
    .from(allowedSenders)
    .where(and(...conditions))
    .limit(1);
  if (byPhone && byPhone.active && byPhone.verificationStatus === 'verified') {
    return { replyPhone: byPhone.phone, senderName: byPhone.name, tenantId: byPhone.tenantId };
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    if (WEBHOOK_SECRET) {
      const secret = request.headers.get('x-webhook-secret') || request.headers.get('apikey');
      if (secret !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    if (body.event !== 'messages.upsert') return NextResponse.json({ ok: true });
    if (isGroupMessage(body)) return NextResponse.json({ ok: true });
    if (isFromMe(body) && wasSentByUs(body?.data?.key?.id)) return NextResponse.json({ ok: true });
    const ownerSelfPhone = isFromMe(body) ? ownerSelfMessagePhone(body) : null;
    if (isFromMe(body) && !ownerSelfPhone) return NextResponse.json({ ok: true });

    // Resolve tenant from instanceName (query param or body)
    const rawInstance = body?.instance;
    const instanceNameParam = request.nextUrl.searchParams.get('instanceName')
      || (typeof rawInstance === 'string' ? rawInstance : rawInstance?.instanceName)
      || null;
    const instanceTenantId = await resolveTenantFromInstance(instanceNameParam);
    if (!instanceTenantId) {
      console.warn('[Webhook] Instancia sem tenant resolvido, ignorando:', instanceNameParam);
      return NextResponse.json({ ok: true });
    }

    const phone = ownerSelfPhone ?? extractPhone(body);
    const fullRemoteJid = body?.data?.key?.remoteJid || '';
    const isLid = !ownerSelfPhone && fullRemoteJid.includes('@lid');
    const pushName = body?.data?.pushName || '';
    const textContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || '';

    console.log('[Webhook] Phone:', phone, 'isLid:', isLid, 'pushName:', pushName, 'selfChat:', !!ownerSelfPhone);

    // 1. Check for verification reply (before sender lookup, since pending senders aren't verified yet)
    if (textContent) {
      const verified = await handleVerification(phone, isLid, textContent, instanceTenantId);
      if (verified) return NextResponse.json({ ok: true });
    }

    // 2. Look up sender (now returns tenantId)
    const sender = await lookupSender(phone, isLid, instanceTenantId);
    if (!sender) {
      console.log('[Webhook] Not allowed:', phone);
      return NextResponse.json({ ok: true });
    }

    const replyTo = sender.replyPhone;
    const tenantId = sender.tenantId;
    console.log('[Webhook] Allowed! ReplyTo:', replyTo, 'Name:', sender.senderName, 'TenantId:', tenantId);

    const message = body.data?.message;
    if (!message) return NextResponse.json({ ok: true });

    const messageId = body.data?.key?.id;
    const hasImage = !!message.imageMessage;
    const hasAudio = !!message.audioMessage;

    // Add user text to history for context in future commands
    if (textContent && !hasImage && !hasAudio) {
      const { addToHistory } = await import('@/lib/whatsapp/admin-commands');
      addToHistory(replyTo, textContent);
    }

    // 3. Check for inventory confirmation reply (ok/cancelar)
    if (textContent && !hasImage && !hasAudio) {
      const handled = await handleConfirmation(replyTo, textContent, tenantId);
      if (handled) return NextResponse.json({ ok: true });
    }

    // 3.5 Check for admin commands (stock adjustments, price updates)
    if (textContent && !hasImage && !hasAudio) {
      const { handleAdminCommand } = await import('@/lib/whatsapp/admin-commands');
      const wasCommand = await handleAdminCommand(replyTo, textContent, tenantId);
      if (wasCommand) return NextResponse.json({ ok: true });
    }

    // 3.6 Check if this is a question (uses Groq to classify intent)
    if (textContent && !hasImage && !hasAudio) {
      const { classifyIntent } = await import('@/lib/whatsapp/intent-classifier');
      const intent = await classifyIntent(textContent);
      if (intent === 'question') {
        const { handleQuestion } = await import('@/lib/whatsapp/chat-agent');
        await handleQuestion(replyTo, textContent, tenantId);
        return NextResponse.json({ ok: true });
      }
    }

    console.log('[Webhook] Processing message from', replyTo);

    // 4. Load product catalog for AI matching
    const catalog = await db.select().from(products).where(and(eq(products.active, true), eq(products.tenantId, tenantId)));

    // 5. Process inventory message
    let result;
    let source: string;

    if (hasImage) {
      source = 'image';
      const { buffer, mimeType } = await downloadMedia(messageId, tenantId);
      const base64 = buffer.toString('base64');
      result = await extractInventoryFromImage(base64, mimeType, catalog);
    } else if (hasAudio) {
      source = 'audio';
      const { buffer } = await downloadMedia(messageId, tenantId);
      const transcription = await transcribeAudio(buffer);
      result = await extractInventoryFromText(transcription, catalog);
      result.raw_text = transcription;
    } else if (textContent) {
      source = 'text';
      result = await extractInventoryFromText(textContent, catalog);
    } else {
      return NextResponse.json({ ok: true });
    }

    console.log('[Webhook] AI result:', result.items.length, 'items');

    if (!result.items.length) {
      await sendMessage(
        replyTo,
        'Não consegui identificar itens nessa mensagem. Tente enviar uma foto mais clara da nota ou descrever os itens (ex: "5 caixas de açaí, 3 pacotes de granola").',
        tenantId
      );
      return NextResponse.json({ ok: true });
    }

    // 6. Resolve product IDs -- create new products for unmatched items
    const produtosCriadosAgora: number[] = [];
    for (const item of result.items) {
      if (item.matched_product_id) {
        // Verify the matched ID exists for this tenant
        const [existing] = await db.select().from(products).where(and(eq(products.id, item.matched_product_id), eq(products.tenantId, tenantId))).limit(1);
        if (!existing) item.matched_product_id = undefined;
      }
      if (!item.matched_product_id) {
        // Create new product in catalog
        const [newProduct] = await db
          .insert(products)
          .values({ tenantId, name: item.product_name, defaultUnit: item.unit })
          .onConflictDoUpdate({ target: [products.tenantId, products.name], set: { active: true } })
          .returning();
        item.matched_product_id = newProduct.id;
        produtosCriadosAgora.push(newProduct.id);
        console.log(`[Webhook] New product created: "${item.product_name}" (ID ${newProduct.id})`);
      }
    }

    // 7. Auto-confirm any existing pending entries from this sender
    const pendingEntries = await db
      .select()
      .from(inventoryEntries)
      .where(
        and(
          eq(inventoryEntries.senderPhone, replyTo),
          eq(inventoryEntries.status, 'pending'),
          eq(inventoryEntries.tenantId, tenantId)
        )
      );

    for (const pe of pendingEntries) {
      await db
        .update(inventoryEntries)
        .set({ status: 'confirmed', confirmedAt: new Date() })
        .where(eq(inventoryEntries.id, pe.id));

      // Apply stock for each auto-confirmed entry
      const peItems = await db.select().from(inventoryItems).where(eq(inventoryItems.entryId, pe.id));
      for (const item of peItems) {
        if (!item.productId) continue;
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) continue;

        const [product] = await db.select().from(products).where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));
        if (!product) continue;

        const { convertToGrams, convertFromGrams } = await import('@/lib/stock/convert-units');
        const unitWeightG = product.unitWeightG ? Number(product.unitWeightG) : null;

        let stockIncrement: number;
        if (item.unit.toLowerCase() === product.defaultUnit.toLowerCase()) {
          stockIncrement = qty;
        } else {
          const inGrams = convertToGrams(qty, item.unit, unitWeightG);
          if (inGrams == null) {
            stockIncrement = qty;
          } else {
            const converted = convertFromGrams(inGrams, product.defaultUnit, unitWeightG);
            stockIncrement = converted ?? qty;
          }
        }

        const totalPrice = item.totalPrice ? Number(item.totalPrice) : null;
        const costPerUnit = totalPrice != null && stockIncrement > 0
          ? String((totalPrice / stockIncrement).toFixed(2))
          : undefined;

        await db.update(products).set({
          currentStock: sql`${products.currentStock}::numeric + ${String(stockIncrement)}::numeric`,
          ...(costPerUnit != null ? { costPerUnit } : {}),
        }).where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));

        const quantityG = convertToGrams(qty, item.unit, unitWeightG);
        await db.insert(stockMovements).values({
          tenantId,
          productId: item.productId,
          type: 'entrada',
          quantity: String(qty),
          unit: item.unit,
          quantityG: quantityG != null ? String(quantityG) : null,
          referenceType: 'inventory_entry',
          referenceId: pe.id,
          createdBy: replyTo,
        });

        const { checkAndCreateAlerts } = await import('@/lib/stock/check-alerts');
        await checkAndCreateAlerts(item.productId, tenantId);
      }

      console.log(`[Webhook] Auto-confirmed entry #${pe.id} (new message arrived from same sender)`);
    }

    // Save new entry
    const [entry] = await db
      .insert(inventoryEntries)
      .values({ tenantId, source, rawText: result.raw_text || null, senderPhone: replyTo, status: 'pending' })
      .returning();

    if (produtosCriadosAgora.length > 0) {
      await db.update(products)
        .set({ createdFromEntryId: entry.id })
        .where(and(eq(products.tenantId, tenantId), inArray(products.id, produtosCriadosAgora)));
    }

    await db.insert(inventoryItems).values(
      result.items.map((item) => ({
        tenantId,
        entryId: entry.id,
        productId: item.matched_product_id || null,
        productName: item.product_name,
        quantity: String(item.quantity),
        unit: item.unit,
        unitPrice: item.unit_price != null ? String(item.unit_price) : null,
        totalPrice: item.total_price != null ? String(item.total_price) : null,
      }))
    );

    // 8. Send confirmation request
    const lines: string[] = [];

    // Show auto-confirmed entries
    if (pendingEntries.length > 0) {
      lines.push(`*${pendingEntries.length} entrada(s) anterior(es) confirmada(s) automaticamente.*\n`);
    }

    const itemsList = result.items
      .map((i) => `  - ${i.product_name}: ${i.quantity} ${i.unit}${i.total_price ? ` (R$${i.total_price.toFixed(2)})` : ''}`)
      .join('\n');
    const totalValue = result.items.reduce((sum, i) => sum + (i.total_price || 0), 0);
    const totalLine = totalValue > 0 ? `\nTotal: R$${totalValue.toFixed(2)}` : '';

    lines.push(`Entrada #${entry.id} registrada!\n\n${itemsList}${totalLine}\n\nResponda *ok* para confirmar ou *cancelar* para descartar.`);

    console.log('[Webhook] Sending confirmation for entry #' + entry.id);
    await sendMessage(replyTo, lines.join('\n'), tenantId);
    console.log('[Webhook] Confirmation sent for entry #' + entry.id);

    return NextResponse.json({ ok: true, entryId: entry.id });
  } catch (error) {
    console.error('[Webhook] Error processing message:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
