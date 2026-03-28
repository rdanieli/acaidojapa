import { NextRequest, NextResponse } from 'next/server';
import { getLocalOrders } from '@/lib/local-orders';
import { aggregateMetrics } from '@/lib/normalize';
import { getTenantScope } from '@/lib/db/tenant';

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
    const orders = await getLocalOrders(start, end, channel, tenantId);
    const metrics = aggregateMetrics(orders);
    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('Metrics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
