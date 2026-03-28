import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dailyStockRuns, allowedSenders, tenants } from '@/lib/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import { processDailySales } from '@/lib/stock/process-daily-sales';
import { sendMessage } from '@/lib/whatsapp/evolution';
import { formatDateISO } from '@/lib/format';
import { getTenantScope } from '@/lib/db/tenant';

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

    const body = await request.json().catch(() => ({}));
    const date = body.date || formatDateISO(new Date());

    const result = await processDailySales(date, tenantId);

    // Send WhatsApp summary to verified senders
    try {
      const senders = await db
        .select()
        .from(allowedSenders)
        .where(and(eq(allowedSenders.verificationStatus, 'verified'), eq(allowedSenders.tenantId, tenantId)));

      if (senders.length > 0) {
        const lines = [
          `📊 *Consolidação Diária — ${date}*`,
          '',
          `Pedidos processados: ${result.ordersProcessed}`,
          `Pedidos pulados (já processados): ${result.ordersSkipped}`,
          `Erros: ${result.errors}`,
        ];
        if (result.unmatchedItems.length > 0) {
          lines.push('', `⚠️ Itens não mapeados (${result.unmatchedItems.length}):`);
          for (const item of result.unmatchedItems.slice(0, 10)) {
            lines.push(`  • ${item}`);
          }
          if (result.unmatchedItems.length > 10) {
            lines.push(`  ... e mais ${result.unmatchedItems.length - 10}`);
          }
        }

        const message = lines.join('\n');
        for (const sender of senders) {
          await sendMessage(sender.phone, message).catch(() => {});
        }
      }
    } catch {
      // Don't fail the run because of WhatsApp errors
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Process Daily Sales] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process daily sales' }, { status: 500 });
  }
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const runs = await db
      .select()
      .from(dailyStockRuns)
      .where(eq(dailyStockRuns.tenantId, tenantId))
      .orderBy(desc(dailyStockRuns.date))
      .limit(limit);

    return NextResponse.json({ runs });
  } catch (error) {
    console.error('[Daily Stock Runs] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
  }
}
