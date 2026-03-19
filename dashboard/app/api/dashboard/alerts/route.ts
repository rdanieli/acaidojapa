import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stockAlerts, products } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  try {
    const alerts = await db
      .select({
        id: stockAlerts.id,
        productId: stockAlerts.productId,
        productName: products.name,
        alertType: stockAlerts.alertType,
        currentStock: stockAlerts.currentStock,
        minStock: stockAlerts.minStock,
        status: stockAlerts.status,
        createdAt: stockAlerts.createdAt,
        resolvedAt: stockAlerts.resolvedAt,
      })
      .from(stockAlerts)
      .leftJoin(products, eq(stockAlerts.productId, products.id))
      .where(eq(stockAlerts.status, 'active'))
      .orderBy(stockAlerts.createdAt);

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('[Alerts API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, status } = await request.json();
    if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });

    const updates: any = { status };
    if (status === 'resolved') updates.resolvedAt = new Date();

    const [updated] = await db
      .update(stockAlerts)
      .set(updates)
      .where(eq(stockAlerts.id, Number(id)))
      .returning();

    return NextResponse.json({ alert: updated });
  } catch (error) {
    console.error('[Alerts API] Error:', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}
