import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, stockMovements, allowedSenders, tenants } from '@/lib/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { sendMessage } from '@/lib/whatsapp/evolution';
import { getTenantScope } from '@/lib/db/tenant';

interface Suggestion {
  productId: number;
  name: string;
  currentStock: number;
  unit: string;
  avgDailyConsumption: number;
  daysUntilStockout: number | null;
  suggestedQty: number;
  costEstimate: number | null;
}

async function generateSuggestions(tenantId: number): Promise<Suggestion[]> {
  // 1. Get all active products
  const activeProducts = await db
    .select()
    .from(products)
    .where(and(eq(products.active, true), eq(products.tenantId, tenantId)));

  // 2. Calculate average daily consumption over last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const consumptionData = await db
    .select({
      productId: stockMovements.productId,
      totalConsumed: sql<string>`COALESCE(SUM(ABS(${stockMovements.quantity})), 0)`,
    })
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.type, 'saida_venda'),
        gte(stockMovements.createdAt, sevenDaysAgo),
        eq(stockMovements.tenantId, tenantId)
      )
    )
    .groupBy(stockMovements.productId);

  const consumptionMap = new Map<number, number>();
  for (const row of consumptionData) {
    consumptionMap.set(row.productId, parseFloat(row.totalConsumed) / 7);
  }

  // 3-4. Build suggestions for products that need restocking
  const suggestions: Suggestion[] = [];

  for (const product of activeProducts) {
    const currentStock = parseFloat(product.currentStock ?? '0');
    const minStock = product.minStock ? parseFloat(product.minStock) : 0;
    const avgDaily = consumptionMap.get(product.id) ?? 0;
    const costPerUnit = product.costPerUnit ? parseFloat(product.costPerUnit) : null;

    const daysUntilStockout = avgDaily > 0 ? currentStock / avgDaily : null;

    const belowMin = minStock > 0 && currentStock < minStock;
    const runningOut = daysUntilStockout !== null && daysUntilStockout < 7;

    if (!belowMin && !runningOut) continue;

    // suggestedQty: enough for 7 days minus current stock
    const neededFor7Days = avgDaily * 7;
    const rawSuggested = Math.max(neededFor7Days - currentStock, 0);
    // Ceil to nice numbers: round up to nearest integer, minimum 1
    const suggestedQty = Math.max(Math.ceil(rawSuggested), 1);

    suggestions.push({
      productId: product.id,
      name: product.name,
      currentStock,
      unit: product.defaultUnit,
      avgDailyConsumption: Math.round(avgDaily * 100) / 100,
      daysUntilStockout: daysUntilStockout !== null ? Math.round(daysUntilStockout * 10) / 10 : null,
      suggestedQty,
      costEstimate: costPerUnit ? Math.round(suggestedQty * costPerUnit * 100) / 100 : null,
    });
  }

  // 5. Sort: out of stock first (currentStock <= 0), then by daysUntilStockout ascending
  suggestions.sort((a, b) => {
    const aOut = a.currentStock <= 0 ? 0 : 1;
    const bOut = b.currentStock <= 0 ? 0 : 1;
    if (aOut !== bOut) return aOut - bOut;

    const aDays = a.daysUntilStockout ?? Infinity;
    const bDays = b.daysUntilStockout ?? Infinity;
    return aDays - bDays;
  });

  return suggestions;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatWhatsAppMessage(suggestions: Suggestion[]): string {
  const today = new Date().toLocaleDateString('pt-BR');

  const lines: string[] = [
    `🛒 *Sugestão de Compras — ${today}*`,
    '',
    'Itens que precisam repor:',
    '',
  ];

  let totalEstimate = 0;

  for (const s of suggestions) {
    const costPart = s.costEstimate !== null ? ` (${formatCurrency(s.costEstimate)})` : '';
    if (s.costEstimate !== null) totalEstimate += s.costEstimate;

    lines.push(`• *${s.name}*: estoque atual ${s.currentStock} ${s.unit} — comprar ~${s.suggestedQty} ${s.unit}${costPart}`);
  }

  lines.push('');
  lines.push(`💰 *Estimativa total: ${formatCurrency(totalEstimate)}*`);
  lines.push('');
  lines.push('_Lista gerada automaticamente com base no consumo dos últimos 7 dias._');

  return lines.join('\n');
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    let tenantId: number;
    if (isCron) {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.active, true)).limit(1);
      if (!tenant) return NextResponse.json({ error: 'No active tenant' }, { status: 404 });
      tenantId = tenant.id;
    } else {
      const session = await getTenantScope();
      tenantId = session.tenantId;
    }

    const suggestions = await generateSuggestions(tenantId);
    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('Shopping list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    let tenantId: number;
    if (isCron) {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.active, true)).limit(1);
      if (!tenant) return NextResponse.json({ error: 'No active tenant' }, { status: 404 });
      tenantId = tenant.id;
    } else {
      const session = await getTenantScope();
      tenantId = session.tenantId;
    }

    const suggestions = await generateSuggestions(tenantId);

    if (suggestions.length === 0) {
      return NextResponse.json({
        sent: false,
        message: 'Nenhum item precisa ser reposto no momento.',
        recipientCount: 0,
        suggestions: [],
      });
    }

    const message = formatWhatsAppMessage(suggestions);

    // Get all verified + active senders
    const recipients = await db
      .select()
      .from(allowedSenders)
      .where(
        and(
          eq(allowedSenders.verificationStatus, 'verified'),
          eq(allowedSenders.active, true),
          eq(allowedSenders.tenantId, tenantId)
        )
      );

    // Send to all recipients
    for (const recipient of recipients) {
      try {
        await sendMessage(recipient.phone, message, tenantId);
      } catch (err) {
        console.error(`Failed to send shopping list to ${recipient.phone}:`, err);
      }
    }

    return NextResponse.json({
      sent: true,
      recipientCount: recipients.length,
      suggestions,
    });
  } catch (error: any) {
    console.error('Shopping list POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
