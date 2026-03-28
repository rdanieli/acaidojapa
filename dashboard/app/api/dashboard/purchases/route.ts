import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventoryEntries, inventoryItems, products } from '@/lib/db/schema';
import { and, gte, lte, eq, inArray } from 'drizzle-orm';
import { getTenantScope } from '@/lib/db/tenant';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end params required' }, { status: 400 });
  }

  try {
    const { tenantId } = await getTenantScope();

    // 1. Fetch confirmed inventory entries in the period
    const entries = await db
      .select()
      .from(inventoryEntries)
      .where(
        and(
          eq(inventoryEntries.status, 'confirmed'),
          gte(inventoryEntries.createdAt, new Date(start + 'T00:00:00')),
          lte(inventoryEntries.createdAt, new Date(end + 'T23:59:59')),
          eq(inventoryEntries.tenantId, tenantId),
        ),
      );

    if (entries.length === 0) {
      return NextResponse.json({
        totalSpent: 0,
        entryCount: 0,
        avgPerEntry: 0,
        byCategory: [],
        dailySpending: [],
        productDetails: [],
      });
    }

    const entryIds = entries.map(e => e.id);

    // 2. Fetch all inventory items for these entries
    const items = await db
      .select()
      .from(inventoryItems)
      .where(inArray(inventoryItems.entryId, entryIds));

    // 3. Load products for category info
    const productRows = await db.select().from(products).where(eq(products.tenantId, tenantId));
    const productMap = new Map<number, typeof productRows[0]>();
    for (const p of productRows) {
      productMap.set(p.id, p);
    }

    // Build entry date map
    const entryDateMap = new Map<number, string>();
    for (const e of entries) {
      const d = e.createdAt;
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      entryDateMap.set(e.id, dateStr);
    }

    // 4. Aggregate
    let totalSpent = 0;
    const categoryTotals = new Map<string, number>();
    const dailyTotals = new Map<string, number>();
    const productAgg = new Map<number, {
      name: string;
      category: string;
      qtyPurchased: number;
      unit: string;
      totalSpent: number;
      costPerUnit: number;
    }>();

    for (const item of items) {
      const itemTotal = Number(item.totalPrice) || 0;
      totalSpent += itemTotal;

      // Category aggregation
      const product = item.productId ? productMap.get(item.productId) : null;
      const category = product?.category || 'outros';
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + itemTotal);

      // Daily aggregation
      const date = entryDateMap.get(item.entryId) || '';
      if (date) {
        dailyTotals.set(date, (dailyTotals.get(date) || 0) + itemTotal);
      }

      // Product detail aggregation
      const productId = item.productId || 0;
      const existing = productAgg.get(productId);
      if (existing) {
        existing.qtyPurchased += Number(item.quantity);
        existing.totalSpent += itemTotal;
      } else {
        productAgg.set(productId, {
          name: product?.name || item.productName,
          category,
          qtyPurchased: Number(item.quantity),
          unit: item.unit,
          totalSpent: itemTotal,
          costPerUnit: product ? Number(product.costPerUnit) || 0 : 0,
        });
      }
    }

    const entryCount = entries.length;
    const avgPerEntry = entryCount > 0 ? totalSpent / entryCount : 0;

    // Format category data for donut chart
    const categoryLabels: Record<string, string> = {
      insumo: 'Insumos',
      embalagem: 'Embalagens',
      complemento: 'Complementos',
      descartavel: 'Descartáveis',
      outros: 'Outros',
    };

    const byCategory = Array.from(categoryTotals.entries())
      .map(([cat, amount]) => ({
        category: cat,
        label: categoryLabels[cat] || cat,
        amount: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    const dailySpending = Array.from(dailyTotals.entries())
      .map(([date, amount]) => ({
        date,
        amount: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const productDetails = Array.from(productAgg.values())
      .map(p => ({
        ...p,
        totalSpent: Math.round(p.totalSpent * 100) / 100,
        qtyPurchased: Math.round(p.qtyPurchased * 1000) / 1000,
        costPerUnit: Math.round(p.costPerUnit * 100) / 100,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);

    return NextResponse.json({
      totalSpent: Math.round(totalSpent * 100) / 100,
      entryCount,
      avgPerEntry: Math.round(avgPerEntry * 100) / 100,
      byCategory,
      dailySpending,
      productDetails,
    });
  } catch (error: any) {
    console.error('Purchases API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
