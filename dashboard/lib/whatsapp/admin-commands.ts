/**
 * WhatsApp admin commands — uses AI to interpret natural language commands.
 *
 * Handles:
 *   - Stock adjustments: "ajuste o estoque do leite ninho para 1500g"
 *   - Price/cost updates: "custo do leite ninho é 25.90 por kg"
 *
 * Uses Groq LLM to parse the intent and extract product name + value,
 * then fuzzy-matches against the product catalog.
 */

import Groq from 'groq-sdk';
import { db } from '@/lib/db';
import { products, stockMovements } from '@/lib/db/schema';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { sendMessage } from '@/lib/whatsapp/evolution';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface ParsedCommand {
  type: 'adjust_stock' | 'set_cost' | 'none';
  productName: string;
  value: number;
  unit: string;
}

/**
 * Use AI to parse a natural language admin command.
 */
async function parseCommand(text: string, productNames: string[]): Promise<ParsedCommand> {
  try {
    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'system',
          content: `Você é um parser de comandos de gestão de estoque. O usuário pode enviar comandos para:
1. AJUSTAR ESTOQUE: definir a quantidade atual de um produto (ex: "ajuste o estoque do leite ninho para 1500g", "coloca 2kg de granola no estoque", "leite ninho tem 1224g")
2. DEFINIR CUSTO: definir o preço/custo por unidade de um produto (ex: "custo do leite ninho 25.90", "preço kg polpa 22.50", "valor do leite ninho é R$30 por kg")

Produtos cadastrados: ${productNames.join(', ')}

Responda APENAS com JSON no formato:
{"type":"adjust_stock","productName":"nome exato do produto","value":1500,"unit":"g"}
ou
{"type":"set_cost","productName":"nome exato do produto","value":25.90,"unit":"un"}
ou
{"type":"none","productName":"","value":0,"unit":""}

IMPORTANTE:
- Use o nome EXATO do produto da lista cadastrada, não o que o usuário digitou
- Se o usuário diz "leite ninho" e existe "Leite Ninho" na lista, use "Leite Ninho"
- Se o comando não é sobre ajuste de estoque nem custo, retorne type "none"
- O value deve ser um número (sem R$, sem pontos de milhar)
- Unidades: g, kg, un, L, ml, cx, pct`
        },
        { role: 'user', content: text }
      ],
      temperature: 0,
      max_tokens: 150,
    });

    const response = completion.choices[0]?.message?.content || '';
    // Extract JSON from response
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
 * Returns true if it was a command and was handled.
 */
export async function handleAdminCommand(
  phone: string,
  text: string,
  tenantId: number,
): Promise<boolean> {
  const normalized = text.trim().toLowerCase();

  // Quick check: does this look like a command at all?
  // Must contain keywords related to stock adjustment or pricing
  const commandKeywords = [
    'ajust', 'estoque', 'custo', 'preço', 'preco', 'valor',
    'coloc', 'defin', 'alter', 'muda', 'atualiz',
  ];
  const looksLikeCommand = commandKeywords.some(kw => normalized.includes(kw));
  if (!looksLikeCommand) return false;

  // Get product catalog for AI matching
  const catalog = await db.select({ name: products.name })
    .from(products)
    .where(and(eq(products.tenantId, tenantId), eq(products.active, true)));
  const productNames = catalog.map(p => p.name);

  if (productNames.length === 0) return false;

  // Parse command with AI
  const command = await parseCommand(text, productNames);

  if (command.type === 'none') return false;

  // Find the product
  const product = await findProduct(tenantId, command.productName);
  if (!product) {
    await sendMessage(
      phone,
      `❌ Produto "${command.productName}" não encontrado no cadastro.`,
      tenantId,
    );
    return true;
  }

  if (command.type === 'adjust_stock') {
    return await adjustStock(phone, tenantId, product, command.value, command.unit);
  }

  if (command.type === 'set_cost') {
    return await setCost(phone, tenantId, product, command.value);
  }

  return false;
}

async function findProduct(tenantId: number, name: string) {
  // Try exact match (case-insensitive)
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
  product: any,
  newQuantity: number,
  unit: string,
): Promise<boolean> {
  const currentStock = Number(product.currentStock) || 0;
  const difference = newQuantity - currentStock;

  await db.update(products)
    .set({ currentStock: String(newQuantity) })
    .where(eq(products.id, product.id));

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
  product: any,
  value: number,
): Promise<boolean> {
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
