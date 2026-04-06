import Groq from 'groq-sdk';
import { db } from '@/lib/db';
import { products, stockAlerts, stockMovements, orders, orderItems } from '@/lib/db/schema';
import { eq, gte, and, sql, desc, ilike } from 'drizzle-orm';
import { sendMessage } from './evolution';
import { addBotResponseToHistory } from './admin-commands';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- Step 1: Query Planner ---

interface QueryPlan {
  queries: ('stock' | 'alerts' | 'movements' | 'sales_by_day' | 'sales_by_item')[];
  product_filter?: string; // filter by product name (partial match)
  days: number; // how many days back to look (max 30)
}

async function planQueries(question: string): Promise<QueryPlan> {
  const completion = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      {
        role: 'system',
        content: `Você é um planejador de consultas para uma loja de açaí. Dada a pergunta do usuário, retorne um JSON indicando quais dados buscar no banco.

Consultas disponíveis:
- "stock" — estoque atual de produtos (nome, quantidade, unidade, mínimo, categoria)
- "alerts" — alertas ativos de estoque baixo/zerado
- "movements" — movimentações de estoque (entradas e saídas)
- "sales_by_day" — vendas agrupadas por dia (quantidade de pedidos e valor total)
- "sales_by_item" — vendas agrupadas por item vendido (quantidade e valor)

Formato do JSON:
{
  "queries": ["stock", "alerts"],
  "product_filter": "açaí",
  "days": 7
}

Regras:
- "queries" é obrigatório — lista com pelo menos 1 consulta
- "product_filter" é opcional — use só se a pergunta menciona um produto específico. Use o nome genérico (ex: "açaí", "granola", "morango")
- "days" é o período em dias (padrão 7, máximo 30). Use 1 para "hoje", 1 para "ontem"
- Para perguntas gerais ("resumo", "como tá"), use ["stock", "alerts"]
- Para "tá acabando algo?" use ["alerts", "stock"]
- Para "vendeu quanto?" use ["sales_by_day", "sales_by_item"]
- Para perguntas sobre movimentação/consumo use ["movements"]
- Retorne APENAS o JSON, sem texto adicional`,
      },
      { role: 'user', content: question },
    ],
    temperature: 0,
    max_tokens: 150,
  });

  const content = completion.choices[0]?.message?.content ?? '';

  try {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return { queries: ['stock', 'alerts'], days: 7 };
    const parsed = JSON.parse(match[0]);
    return {
      queries: Array.isArray(parsed.queries) ? parsed.queries : ['stock', 'alerts'],
      product_filter: typeof parsed.product_filter === 'string' ? parsed.product_filter : undefined,
      days: Math.min(Math.max(Number(parsed.days) || 7, 1), 30),
    };
  } catch {
    return { queries: ['stock', 'alerts'], days: 7 };
  }
}

// --- Step 2: Execute Queries ---

async function executeQueries(plan: QueryPlan): Promise<Record<string, string>> {
  const since = new Date(Date.now() - plan.days * 24 * 60 * 60 * 1000);
  const sinceDate = since.toISOString().split('T')[0];
  const data: Record<string, string> = {};

  const tasks: Promise<void>[] = [];

  if (plan.queries.includes('stock')) {
    tasks.push(
      (async () => {
        let query = db
          .select({
            name: products.name,
            currentStock: products.currentStock,
            minStock: products.minStock,
            defaultUnit: products.defaultUnit,
            category: products.category,
          })
          .from(products)
          .where(
            plan.product_filter
              ? and(eq(products.active, true), ilike(products.name, `%${plan.product_filter}%`))
              : eq(products.active, true)
          );

        const rows = await query;
        if (rows.length === 0) {
          data.stock = plan.product_filter
            ? `Nenhum produto encontrado com "${plan.product_filter}".`
            : 'Nenhum produto cadastrado.';
        } else {
          data.stock = rows
            .map((p) => {
              const stock = Number(p.currentStock) || 0;
              const min = p.minStock ? Number(p.minStock) : null;
              const flag = min != null && stock <= min ? ' ⚠️' : '';
              return `- ${p.name}: ${stock} ${p.defaultUnit}${min != null ? ` (mín: ${min})` : ''}${flag}`;
            })
            .join('\n');
        }
      })()
    );
  }

  if (plan.queries.includes('alerts')) {
    tasks.push(
      (async () => {
        const rows = await db
          .select({
            productName: products.name,
            alertType: stockAlerts.alertType,
            currentStock: stockAlerts.currentStock,
            minStock: stockAlerts.minStock,
          })
          .from(stockAlerts)
          .innerJoin(products, eq(stockAlerts.productId, products.id))
          .where(eq(stockAlerts.status, 'active'));

        data.alerts =
          rows.length > 0
            ? rows.map((a) => `- ${a.productName}: ${a.alertType} (atual: ${a.currentStock}, mín: ${a.minStock})`).join('\n')
            : 'Nenhum alerta ativo.';
      })()
    );
  }

  if (plan.queries.includes('movements')) {
    tasks.push(
      (async () => {
        const conditions = [gte(stockMovements.createdAt, since)];
        // If product filter, join and filter
        let rows;
        if (plan.product_filter) {
          rows = await db
            .select({
              productName: products.name,
              type: stockMovements.type,
              quantity: stockMovements.quantity,
              unit: stockMovements.unit,
              createdAt: stockMovements.createdAt,
            })
            .from(stockMovements)
            .innerJoin(products, eq(stockMovements.productId, products.id))
            .where(and(gte(stockMovements.createdAt, since), ilike(products.name, `%${plan.product_filter}%`)))
            .orderBy(desc(stockMovements.createdAt))
            .limit(50);
        } else {
          rows = await db
            .select({
              productName: products.name,
              type: stockMovements.type,
              quantity: stockMovements.quantity,
              unit: stockMovements.unit,
              createdAt: stockMovements.createdAt,
            })
            .from(stockMovements)
            .innerJoin(products, eq(stockMovements.productId, products.id))
            .where(gte(stockMovements.createdAt, since))
            .orderBy(desc(stockMovements.createdAt))
            .limit(50);
        }

        data.movements =
          rows.length > 0
            ? rows
                .map(
                  (m) =>
                    `- ${m.productName}: ${m.type} ${m.quantity} ${m.unit} (${new Date(m.createdAt).toLocaleDateString('pt-BR')})`
                )
                .join('\n')
            : 'Nenhuma movimentação no período.';
      })()
    );
  }

  if (plan.queries.includes('sales_by_day')) {
    tasks.push(
      (async () => {
        const rows = await db
          .select({
            date: orders.date,
            count: sql<number>`count(*)::int`,
            total: sql<string>`coalesce(sum(${orders.total}::numeric), 0)::text`,
          })
          .from(orders)
          .where(gte(orders.date, sinceDate))
          .groupBy(orders.date)
          .orderBy(desc(orders.date));

        data.sales_by_day =
          rows.length > 0
            ? rows.map((s) => `- ${s.date}: ${s.count} pedidos, R$${Number(s.total).toFixed(2)}`).join('\n')
            : 'Nenhuma venda no período.';
      })()
    );
  }

  if (plan.queries.includes('sales_by_item')) {
    tasks.push(
      (async () => {
        let query;
        if (plan.product_filter) {
          query = db
            .select({
              name: orderItems.name,
              qty: sql<string>`sum(${orderItems.quantity}::numeric)::text`,
              value: sql<string>`sum(${orderItems.totalPrice}::numeric)::text`,
            })
            .from(orderItems)
            .innerJoin(orders, eq(orderItems.orderId, orders.id))
            .where(and(gte(orders.date, sinceDate), ilike(orderItems.name, `%${plan.product_filter}%`)))
            .groupBy(orderItems.name)
            .orderBy(sql`sum(${orderItems.totalPrice}::numeric) desc`)
            .limit(30);
        } else {
          query = db
            .select({
              name: orderItems.name,
              qty: sql<string>`sum(${orderItems.quantity}::numeric)::text`,
              value: sql<string>`sum(${orderItems.totalPrice}::numeric)::text`,
            })
            .from(orderItems)
            .innerJoin(orders, eq(orderItems.orderId, orders.id))
            .where(gte(orders.date, sinceDate))
            .groupBy(orderItems.name)
            .orderBy(sql`sum(${orderItems.totalPrice}::numeric) desc`)
            .limit(30);
        }

        const rows = await query;
        data.sales_by_item =
          rows.length > 0
            ? rows.map((s) => `- ${s.name}: ${Number(s.qty).toFixed(0)} un, R$${Number(s.value).toFixed(2)}`).join('\n')
            : 'Nenhuma venda por item no período.';
      })()
    );
  }

  await Promise.all(tasks);
  return data;
}

// --- Step 3: Generate Response ---

async function generateResponse(question: string, data: Record<string, string>, days: number): Promise<string> {
  const today = new Date().toISOString().split('T')[0];

  const sections: string[] = [];
  if (data.stock) sections.push(`ESTOQUE ATUAL:\n${data.stock}`);
  if (data.alerts) sections.push(`ALERTAS ATIVOS:\n${data.alerts}`);
  if (data.movements) sections.push(`MOVIMENTAÇÕES (últimos ${days} dias):\n${data.movements}`);
  if (data.sales_by_day) sections.push(`VENDAS POR DIA (últimos ${days} dias):\n${data.sales_by_day}`);
  if (data.sales_by_item) sections.push(`VENDAS POR ITEM (últimos ${days} dias):\n${data.sales_by_item}`);

  const completion = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      {
        role: 'system',
        content: `Você é o assistente de gestão da loja. Responda a pergunta com base nos dados abaixo.

DATA DE HOJE: ${today}

${sections.join('\n\n')}

REGRAS:
- Responda curto e informal (é WhatsApp)
- Use *negrito* para destaques e listas com -
- Emojis com moderação (✅ ⚠️ ❌)
- NÃO invente dados — use apenas o que está acima
- Responda em português
- Se não tiver dados suficientes, diga que não tem`,
      },
      { role: 'user', content: question },
    ],
    temperature: 0.1,
    max_tokens: 500,
  });

  return completion.choices[0]?.message?.content ?? '';
}

// --- Main Handler ---

export async function handleQuestion(phone: string, text: string, tenantId?: number): Promise<void> {
  try {
    // Step 1: Plan which queries to run
    const plan = await planQueries(text);
    console.log('[ChatAgent] Plan:', JSON.stringify(plan));

    // Step 2: Execute only the needed queries
    const data = await executeQueries(plan);

    // Step 3: Generate natural response
    const response = await generateResponse(text, data, plan.days);

    if (response) {
      await sendMessage(phone, response, tenantId);
      addBotResponseToHistory(phone, response);
    } else {
      await sendFallbackResponse(phone, tenantId);
    }
  } catch (error) {
    console.error('[ChatAgent] Error:', error);
    await sendFallbackResponse(phone, tenantId);
  }
}

async function sendFallbackResponse(phone: string, tenantId?: number): Promise<void> {
  try {
    const catalog = await db
      .select({ name: products.name, currentStock: products.currentStock, defaultUnit: products.defaultUnit })
      .from(products)
      .where(eq(products.active, true));

    const lines = ['*Resumo do estoque:*\n'];
    for (const p of catalog) {
      lines.push(`- ${p.name}: ${Number(p.currentStock) || 0} ${p.defaultUnit}`);
    }
    await sendMessage(phone, lines.join('\n'), tenantId);
  } catch {
    await sendMessage(phone, 'Desculpa, não consegui buscar os dados agora. Tenta de novo em alguns minutos.', tenantId);
  }
}
