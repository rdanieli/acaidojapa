import { NextRequest, NextResponse } from 'next/server';
import { getLocalOrderById } from '@/lib/local-orders';
import { getTenantScope } from '@/lib/db/tenant';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const { tenantId } = await getTenantScope();
    const order = await getLocalOrderById(id, tenantId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Order detail error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
