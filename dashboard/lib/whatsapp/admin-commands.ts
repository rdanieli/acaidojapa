/**
 * WhatsApp admin commands — uses AI to interpret natural language commands
 * with message history context, and requires confirmation before applying.
 *
 * Flow:
 *   1. User sends command (may reference prior messages)
 *   2. AI parses using last 5 messages as context
 *   3. System creates pending_admin_commands entry
 *   4. Bot asks for confirmation ("ok" or "cancelar")
 *   5. Confirmation handler applies the change
 */

import Groq from 'groq-sdk';
import { db } from '@/lib/db';
import { products, pendingAdminCommands } from '@/lib/db/schema';
import { eq, and, ilike } from 'drizzle-orm';
import { sendMessage } from '@/lib/whatsapp/evolution';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- In-memory message history (per phone, 30min TTL) ---
interface HistoryEntry {
  messages: string[];
  expiresAt: number;
}
const messageHistory = new Map<string, HistoryEntry>();
const HISTORY_TTL_MS = 30 * 60 * 1000;
const HISTORY_MAX_MESSAGES = 5;

export function addToHistory(phone: string, message: string) {
  if (!message?.trim()) return;
  const now = Date.now();
  let entry = messageHistory.get(phone);
  if (!entry || now > entry.expiresAt) {
    entry = { messages: [], expiresAt: now + HISTORY_TTL_MS };
    messageHistory.set(phone, entry);
  }
  entry.messages.push(message.trim());
  if (entry.messages.length > HISTORY_MAX_MESSAGES) {
    entry.messages.shift();
  }
  entry.expiresAt = now + HISTORY_TTL_MS;
}

function getHistory(phone: string): string[] {
  const entry = messageHistory.get(phone);
  if (!entry || Date.now() > entry.expiresAt) return [];
  return entry.messages.slice(0, -1); // exclude current message
}

// --- Bot response history (for products mentioned by the bot) ---
interface BotResponseEntry {
  messages: string[];
  expiresAt: number;
}
const botResponseHistory = new Map<string, BotResponseEntry>();

export function addBotResponseToHistory(phone: string, message: string) {
  if (!message?.trim()) return;
  const now = Date.now();
  let entry = botResponseHistory.get(phone);
  if (!entry || now > entry.expiresAt) {
    entry = { messages: [], expiresAt: now + HISTORY_TTL_MS };
    botResponseHistory.set(phone, entry);
  }
  entry.messages.push(message.trim());
  if (entry.messages.length > HISTORY_MAX_MESSAGES) {
    entry.messages.shift();
  }
  entry.expiresAt = now + HISTORY_TTL_MS;
}

function getBotHistory(phone: string): string[] {
  const entry = botResponseHistory.get(phone);
  if (!entry || Date.now() > entry.expiresAt) return [];
  return entry.messages;
}

interface ParsedCommand {
  type: 'adjust_stock' | 'set_cost' | 'none';
  productName: string;
  value: number;
  unit: string;
}

async function parseCommand(text: string, productNames: string[], userHistory: string[], botHistory: string[]): Promise<ParsedCommand> {
  try {
    const historyText = userHistory.length > 0 || botHistory.length > 0
      ? `\nHistórico recente da conversa (use para entender o contexto):\n` +
        [...botHistory.map(m => `BOT: ${m}`), ...userHistory.map(m => `USUÁRIO: ${m}`)].join('\n') + '\n'
      : '';

    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'system',
          content: `Você é um parser de comandos de gestão de estoque. O usuário pode enviar comandos para:
1. AJUSTAR ESTOQUE: definir a quantidade atual de um produto (ex: "ajuste o estoque do leite ninho para 1500g", "corrija para 50000g", "leite ninho tem 1224g")
2. DEFINIR CUSTO: definir o preço/custo por unidade de um produto (ex: "custo do leite ninho 25.90", "preço kg polpa 22.50")

Produtos cadastrados: ${productNames.join(', ')}
${historyText}
IMPORTANTE — USO DO CONTEXTO:
- Se o usuário não mencionar o produto na mensagem atual (ex: "corrija para 50000g"), procure no histórico QUAL PRODUTO estava sendo discutido
- Se o histórico menciona "açaí" e o usuário diz "corrija para 50000g", o produto é Açaí
- Se NÃO houver contexto claro do produto, retorne type "none"

Responda APENAS com JSON no formato:
{"type":"adjust_stock","productName":"nome exato do produto","value":1500,"unit":"g"}
ou
{"type":"set_cost","productName":"nome exato do produto","value":25.90,"unit":"un"}
ou
{"type":"none","productName":"","value":0,"unit":""}

REGRAS:
- Use o nome EXATO do produto da lista cadastrada
- Se o usuário diz "leite ninho" e existe "Leite Ninho" na lista, use "Leite Ninho"
- Se não conseguir identificar o produto com certeza, retorne "none"
- O value deve ser um número (sem R$, sem pontos de milhar)
- Unidades: g, kg, un, L, ml, cx, pct`
        },
        { role: 'user', content: text }
      ],
      temperature: 0,
      max_tokens: 150,
    });

    const response = completion.choices[0]?.message?.content || '';
    const jsonMatch = response.match(/\{[^}]+\}/);
    if (!jsonMatch) return { type: 'none', productName: '', value: 0, unit: '' };

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      type: parsed.type || 'none',
      productName: parsed.productName || '',
      value: Number(parsed.value) || 0,
      unit: parsed.unit || 'g',
    };
  } catch (err) {
    console.error('[AdminCommands] Parse error:', err);
    return { type: 'none', productName: '', value: 0, unit: '' };
  }
}

/**
 * Try to handle the message as an admin command.
 * If a command is detected, creates a pending_admin_commands entry
 * and asks for user confirmation. Returns true if handled.
 */
export async function handleAdminCommand(
  phone: string,
  text: string,
  tenantId: number,
): Promise<boolean> {
  const normalized = text.trim().toLowerCase();

  // Quick check: does this look like a command?
  const commandKeywords = [
    'ajust', 'estoque', 'custo', 'preço', 'preco', 'valor',
    'coloc', 'defin', 'alter', 'muda', 'atualiz', 'corrij', 'corrig',
  ];
  const looksLikeCommand = commandKeywords.some(kw => normalized.includes(kw));
  if (!looksLikeCommand) return false;

  // Get product catalog
  const catalog = await db.select({ name: products.name })
    .from(products)
    .where(and(eq(products.tenantId, tenantId), eq(products.active, true)));
  const productNames = catalog.map(p => p.name);

  if (productNames.length === 0) return false;

  // Parse command with AI + history context
  const userHistory = getHistory(phone);
  const botHistory = getBotHistory(phone);
  const command = await parseCommand(text, productNames, userHistory, botHistory);

  if (command.type === 'none') return false;

  // Find the product
  const product = await findProduct(tenantId, command.productName);
  if (!product) {
    const msg = `❌ Produto "${command.productName}" não encontrado no cadastro.`;
    await sendMessage(phone, msg, tenantId);
    addBotResponseToHistory(phone, msg);
    return true;
  }

  // Create pending command (awaits confirmation)
  if (command.type === 'adjust_stock') {
    return await createPendingStockAdjustment(phone, tenantId, product, command.value, command.unit);
  }
  if (command.type === 'set_cost') {
    return await createPendingCostAdjustment(phone, tenantId, product, command.value);
  }

  return false;
}

async function findProduct(tenantId: number, name: string) {
  let [product] = await db.select().from(products)
    .where(and(eq(products.tenantId, tenantId), ilike(products.name, name)))
    .limit(1);
  if (product) return product;
  [product] = await db.select().from(products)
    .where(and(eq(products.tenantId, tenantId), ilike(products.name, `%${name}%`)))
    .limit(1);
  return product || null;
}

async function createPendingStockAdjustment(
  phone: string,
  tenantId: number,
  product: any,
  newQuantity: number,
  unit: string,
): Promise<boolean> {
  const currentStock = Number(product.currentStock) || 0;
  const difference = newQuantity - currentStock;
  const displayUnit = unit || product.defaultUnit;

  // Cancel any previous pending command from this sender
  await db.update(pendingAdminCommands)
    .set({ status: 'canceled' })
    .where(and(
      eq(pendingAdminCommands.senderPhone, phone),
      eq(pendingAdminCommands.tenantId, tenantId),
      eq(pendingAdminCommands.status, 'pending'),
    ));

  // Create new pending
  await db.insert(pendingAdminCommands).values({
    tenantId,
    senderPhone: phone,
    commandType: 'adjust_stock',
    productId: product.id,
    productName: product.name,
    oldValue: String(currentStock),
    newValue: String(newQuantity),
    unit: displayUnit,
  });

  const msg = `📝 *Confirma o ajuste?*\n\nProduto: *${product.name}*\nAntes: ${currentStock} ${product.defaultUnit}\nAgora: ${newQuantity} ${displayUnit}\nDiferença: ${difference > 0 ? '+' : ''}${difference}\n\nResponda *ok* para confirmar ou *cancelar*.`;
  await sendMessage(phone, msg, tenantId);
  addBotResponseToHistory(phone, msg);
  return true;
}

async function createPendingCostAdjustment(
  phone: string,
  tenantId: number,
  product: any,
  newValue: number,
): Promise<boolean> {
  const oldCost = product.costPerUnit ? Number(product.costPerUnit) : null;

  await db.update(pendingAdminCommands)
    .set({ status: 'canceled' })
    .where(and(
      eq(pendingAdminCommands.senderPhone, phone),
      eq(pendingAdminCommands.tenantId, tenantId),
      eq(pendingAdminCommands.status, 'pending'),
    ));

  await db.insert(pendingAdminCommands).values({
    tenantId,
    senderPhone: phone,
    commandType: 'set_cost',
    productId: product.id,
    productName: product.name,
    oldValue: oldCost != null ? String(oldCost) : null,
    newValue: String(newValue),
    unit: product.defaultUnit,
  });

  const msg = `📝 *Confirma a alteração de custo?*\n\nProduto: *${product.name}*\n${oldCost != null ? `Antes: R$ ${oldCost.toFixed(2)}` : 'Antes: não definido'}\nAgora: R$ ${newValue.toFixed(2)} por ${product.defaultUnit}\n\nResponda *ok* para confirmar ou *cancelar*.`;
  await sendMessage(phone, msg, tenantId);
  addBotResponseToHistory(phone, msg);
  return true;
}
