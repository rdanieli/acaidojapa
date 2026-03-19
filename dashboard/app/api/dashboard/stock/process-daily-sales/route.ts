import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dailyStockRuns, allowedSenders } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { processDailySales } from '@/lib/stock/process-daily-sales';
import { sendMessage } from '@/lib/whatsapp/evolution';
import { formatDateISO } from '@/lib/format';

function isAuthorized(request: NextRequest): boolean {
  // Check CRON_SECRET bearer token
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
      return true;
    }
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Auth: JWT middleware handles cookie auth, but for cron we need CRON_SECRET
    // If we got here, either middleware passed (cookie auth) or it's a public path
    // For cron, verify the secret
    const isCookieAuth = request.cookies.has('auth-token');
    if (!isCookieAuth && !isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const date = body.date || formatDateISO(new Date());

    const result = await processDailySales(date);

    // Send WhatsApp summary to verified senders
    try {
      const senders = await db
        .select()
        .from(allowedSenders)
        .where(eq(allowedSenders.verificationStatus, 'verified'));

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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const runs = await db
      .select()
      .from(dailyStockRuns)
      .orderBy(desc(dailyStockRuns.date))
      .limit(limit);

    return NextResponse.json({ runs });
  } catch (error) {
    console.error('[Daily Stock Runs] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
  }
}
