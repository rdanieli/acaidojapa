import { NextRequest, NextResponse } from 'next/server';
import { getLocalOrders } from '@/lib/local-orders';
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
    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('Orders error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
