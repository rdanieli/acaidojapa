import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { eq, sql, and, lte, gt } from 'drizzle-orm';

export async function GET() {
  try {
    const activeProducts = await db
      .select()
      .from(products)
      .where(eq(products.active, true));

    const totalProducts = activeProducts.length;
    let lowStock = 0;
    let outOfStock = 0;

    const critical: any[] = [];

    for (const p of activeProducts) {
      const stock = Number(p.currentStock) || 0;
      const min = p.minStock ? Number(p.minStock) : null;

      if (stock <= 0) {
        outOfStock++;
        critical.push({ id: p.id, name: p.name, currentStock: stock, minStock: min, status: 'out' });
      } else if (min != null && stock <= min) {
        lowStock++;
        critical.push({ id: p.id, name: p.name, currentStock: stock, minStock: min, status: 'low' });
      }
    }

    // Sort critical: out of stock first, then by how far below min
    critical.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'out' ? -1 : 1;
      const aRatio = a.minStock ? a.currentStock / a.minStock : 1;
      const bRatio = b.minStock ? b.currentStock / b.minStock : 1;
      return aRatio - bRatio;
    });

    return NextResponse.json({
      totalProducts,
      lowStock,
      outOfStock,
      criticalProducts: critical.slice(0, 5),
    });
  } catch (error) {
    console.error('[Stock Summary API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stock summary' }, { status: 500 });
  }
}
