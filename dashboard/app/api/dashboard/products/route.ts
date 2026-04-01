import { NextRequest, NextResponse } from 'next/server';
import { getLocalOrders } from '@/lib/local-orders';
import { getTenantScope } from '@/lib/db/tenant';

interface ProductStats {
  name: string;
  qty: number;
  revenue: number;
  avgPrice: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end params required' }, { status: 400 });
  }

  try {
    const { tenantId } = await getTenantScope();
    const orders = await getLocalOrders(start, end, tenantId);
    const completed = orders.filter((o) => o.status === 'completed');
    const prodMap = new Map<string, ProductStats>();

    for (const order of completed) {
      for (const item of order.items) {
        const existing = prodMap.get(item.name) || {
          name: item.name,
          qty: 0,
          revenue: 0,
          avgPrice: 0,
        };
        existing.qty += item.quantity;
        existing.revenue += item.totalPrice;
        prodMap.set(item.name, existing);
      }
    }

    const products = Array.from(prodMap.values())
      .map((p) => ({ ...p, avgPrice: p.qty > 0 ? p.revenue / p.qty : 0 }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error('Products error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
