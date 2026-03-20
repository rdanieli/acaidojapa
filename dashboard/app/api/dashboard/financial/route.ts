import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, productNameAliases, soldProducts, recipes, products } from '@/lib/db/schema';
import { and, gte, lte, eq, desc, inArray, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const channel = searchParams.get('channel');

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end params required' }, { status: 400 });
  }

  try {
    // 1. Fetch completed orders in the period
    const conditions = [
      gte(orders.date, start),
      lte(orders.date, end),
      eq(orders.status, 'completed'),
    ];
    if (channel === 'pdv') conditions.push(eq(orders.channel, 'pdv'));
    if (channel === 'online') conditions.push(eq(orders.channel, 'online'));

    const dbOrders = await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.datetime));

    if (dbOrders.length === 0) {
      return NextResponse.json({
        revenue: 0,
        cmv: 0,
        grossProfit: 0,
        marginPercent: 0,
        dailyTrend: [],
        productMargins: [],
        unmappedItems: 0,
      });
    }

    // 2. Batch-load all order items
    const orderIds = dbOrders.map(o => o.id);
    const allItems = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    // 3. Load all alias mappings, sold products, recipes, and product costs
    const [aliasRows, soldProductRows, recipeRows, productRows] = await Promise.all([
      db.select().from(productNameAliases),
      db.select().from(soldProducts),
      db.select().from(recipes),
      db.select().from(products).where(eq(products.active, true)),
    ]);

    // Build lookup maps
    const aliasMap = new Map<string, number>(); // normalized alias → soldProductId
    for (const a of aliasRows) {
      aliasMap.set(a.alias.toLowerCase().trim(), a.soldProductId);
    }

    const soldProductMap = new Map<number, typeof soldProductRows[0]>();
    for (const sp of soldProductRows) {
      soldProductMap.set(sp.id, sp);
    }

    // Recipes grouped by soldProductId
    const recipeMap = new Map<number, typeof recipeRows>();
    for (const r of recipeRows) {
      const arr = recipeMap.get(r.soldProductId);
      if (arr) arr.push(r);
      else recipeMap.set(r.soldProductId, [r]);
    }

    // Product cost lookup
    const productCostMap = new Map<number, { costPerUnit: number; defaultUnit: string; unitWeightG: number | null }>();
    for (const p of productRows) {
      productCostMap.set(p.id, {
        costPerUnit: Number(p.costPerUnit) || 0,
        defaultUnit: p.defaultUnit,
        unitWeightG: p.unitWeightG ? Number(p.unitWeightG) : null,
      });
    }

    // 4. Group orders by date for daily trend
    const orderDateMap = new Map<number, string>(); // orderId → date
    for (const o of dbOrders) {
      orderDateMap.set(o.id, o.date);
    }

    // 5. Calculate CMV for each order item
    let totalRevenue = 0;
    let totalCmv = 0;
    let unmappedItems = 0;

    // Per-product margin tracking
    const productStats = new Map<string, {
      soldProductId: number;
      name: string;
      qtySold: number;
      revenue: number;
      cmv: number;
    }>();

    // Per-day tracking
    const dailyMap = new Map<string, { revenue: number; cmv: number }>();

    function getRecipeCost(soldProductId: number): number {
      const recipeIngredients = recipeMap.get(soldProductId);
      if (!recipeIngredients || recipeIngredients.length === 0) return 0;

      let cost = 0;
      for (const ingredient of recipeIngredients) {
        const productInfo = productCostMap.get(ingredient.productId);
        if (!productInfo || productInfo.costPerUnit === 0) continue;

        const quantityG = Number(ingredient.quantityG);

        // Convert based on defaultUnit of the product
        if (productInfo.defaultUnit === 'kg') {
          // costPerUnit is per kg, quantityG is in grams → divide by 1000
          cost += (quantityG / 1000) * productInfo.costPerUnit;
        } else if (productInfo.defaultUnit === 'g') {
          // costPerUnit is per gram
          cost += quantityG * productInfo.costPerUnit;
        } else if (productInfo.defaultUnit === 'L') {
          // Assume 1g ≈ 1ml → quantityG/1000 = liters
          cost += (quantityG / 1000) * productInfo.costPerUnit;
        } else if (productInfo.defaultUnit === 'un') {
          // unitWeightG tells us how many grams per unit
          if (productInfo.unitWeightG && productInfo.unitWeightG > 0) {
            const units = quantityG / productInfo.unitWeightG;
            cost += units * productInfo.costPerUnit;
          } else {
            // Fallback: treat quantityG as quantity in grams, costPerUnit as per-unit
            // If no weight info, assume 1 unit = 1g (unlikely but safe fallback)
            cost += quantityG * productInfo.costPerUnit;
          }
        } else {
          // Default: treat as kg
          cost += (quantityG / 1000) * productInfo.costPerUnit;
        }
      }
      return cost;
    }

    for (const item of allItems) {
      const qty = Number(item.quantity);
      const itemRevenue = Number(item.totalPrice);
      const date = orderDateMap.get(item.orderId) || '';

      totalRevenue += itemRevenue;

      // Track daily revenue
      const daily = dailyMap.get(date);
      if (daily) {
        daily.revenue += itemRevenue;
      } else {
        dailyMap.set(date, { revenue: itemRevenue, cmv: 0 });
      }

      // Find soldProduct via alias
      const normalizedName = item.name.toLowerCase().trim();
      const soldProductId = aliasMap.get(normalizedName);

      if (!soldProductId) {
        unmappedItems++;
        // Still track revenue per product name even without CMV
        const key = `unmapped-${normalizedName}`;
        const existing = productStats.get(key);
        if (existing) {
          existing.qtySold += qty;
          existing.revenue += itemRevenue;
        } else {
          productStats.set(key, {
            soldProductId: 0,
            name: item.name,
            qtySold: qty,
            revenue: itemRevenue,
            cmv: 0,
          });
        }
        continue;
      }

      const recipeCost = getRecipeCost(soldProductId);
      const itemCmv = recipeCost * qty;

      totalCmv += itemCmv;

      // Track daily CMV
      const dailyEntry = dailyMap.get(date);
      if (dailyEntry) dailyEntry.cmv += itemCmv;

      // Track per-product stats
      const sp = soldProductMap.get(soldProductId);
      const productKey = `sp-${soldProductId}`;
      const existing = productStats.get(productKey);
      if (existing) {
        existing.qtySold += qty;
        existing.revenue += itemRevenue;
        existing.cmv += itemCmv;
      } else {
        productStats.set(productKey, {
          soldProductId,
          name: sp?.name || item.name,
          qtySold: qty,
          revenue: itemRevenue,
          cmv: itemCmv,
        });
      }
    }

    const grossProfit = totalRevenue - totalCmv;
    const marginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Build daily trend sorted by date
    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        revenue: Math.round(data.revenue * 100) / 100,
        cmv: Math.round(data.cmv * 100) / 100,
        profit: Math.round((data.revenue - data.cmv) * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Build product margins sorted by profit desc
    const productMargins = Array.from(productStats.values())
      .map(p => ({
        soldProductId: p.soldProductId,
        name: p.name,
        qtySold: p.qtySold,
        revenue: Math.round(p.revenue * 100) / 100,
        cmv: Math.round(p.cmv * 100) / 100,
        profit: Math.round((p.revenue - p.cmv) * 100) / 100,
        marginPercent: p.revenue > 0 ? Math.round(((p.revenue - p.cmv) / p.revenue) * 10000) / 100 : 0,
        hasRecipe: p.soldProductId > 0 && (recipeMap.get(p.soldProductId)?.length || 0) > 0,
      }))
      .sort((a, b) => b.profit - a.profit);

    return NextResponse.json({
      revenue: Math.round(totalRevenue * 100) / 100,
      cmv: Math.round(totalCmv * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      marginPercent: Math.round(marginPercent * 100) / 100,
      dailyTrend,
      productMargins,
      unmappedItems,
    });
  } catch (error: any) {
    console.error('Financial API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
