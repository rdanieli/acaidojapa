import { NextRequest, NextResponse } from 'next/server';
import { getLocalOrders } from '@/lib/local-orders';
import { aggregateMetrics } from '@/lib/normalize';
import { getTenantScope } from '@/lib/db/tenant';
import { db } from '@/lib/db';
import { manualSales } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import type { UnifiedOrder } from '@/lib/types';

function manualSaleToUnifiedOrder(sale: any): UnifiedOrder {
  const items = (sale.items as any[]).map((item: any) => ({
    name: item.name || 'Produto',
    quantity: Number(item.quantity) || 1,
    unitPrice: Number(item.unitPrice) || 0,
    totalPrice: Number(item.quantity || 1) * Number(item.unitPrice || 0),
  }));

  const paymentMethod = sale.paymentMethod || 'Não informado';
  const total = Number(sale.total) || 0;

  return {
    id: `manual-${sale.id}`,
    channel: 'pdv', // count manual sales as in-store
    displayId: `M-${sale.id}`,
    datetime: `${sale.date}T12:00:00`,
    total,
    status: 'completed',
    orderType: 'balcao',
    items,
    payments: [{ method: paymentMethod, amount: total }],
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const channel = searchParams.get('channel');

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end params required' }, { status: 400 });
  }

  try {
    const { tenantId } = await getTenantScope();

    // Get POS orders
    const posOrders = await getLocalOrders(start, end, channel, tenantId);

    // Get manual sales
    const manualSalesData = await db.select().from(manualSales)
      .where(and(
        eq(manualSales.tenantId, tenantId),
        gte(manualSales.date, start),
        lte(manualSales.date, end),
      ));

    // Convert manual sales to unified format and merge
    const manualOrders = manualSalesData.map(manualSaleToUnifiedOrder);

    // If channel filter is 'online', exclude manual sales (they're in-store)
    const allOrders = channel === 'online'
      ? posOrders
      : [...posOrders, ...manualOrders];

    const metrics = aggregateMetrics(allOrders);
    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('Metrics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
