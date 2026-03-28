import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, soldProducts, recipes, products, complementGramages } from '@/lib/db/schema';
import { and, gte, lte, eq, desc, inArray } from 'drizzle-orm';
import { parseOrderItem, clearParserCaches } from '@/lib/stock/parse-order-item';
import { getTenantScope } from '@/lib/db/tenant';

/** Cup total weight = sizeMl in grams (200ml cup = 200g total) */
const CUP_WEIGHTS: Record<number, number> = {
  200: 200,
  300: 300,
  400: 400,
  500: 500,
  700: 700,
};

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
    clearParserCaches();

    // 1. Fetch completed orders in the period
    const conditions = [
      gte(orders.date, start),
      lte(orders.date, end),
      eq(orders.status, 'completed'),
      eq(orders.tenantId, tenantId),
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

    // 3. Load sold products, recipes, product costs, complement gramages, and acai product
    const [soldProductRows, recipeRows, productRows, complementGramageRows] = await Promise.all([
      db.select().from(soldProducts).where(eq(soldProducts.tenantId, tenantId)),
      db.select().from(recipes).where(eq(recipes.tenantId, tenantId)),
      db.select().from(products).where(and(eq(products.active, true), eq(products.tenantId, tenantId))),
      db.select().from(complementGramages).where(eq(complementGramages.tenantId, tenantId)),
    ]);

    const soldProductMap = new Map<number, typeof soldProductRows[0]>();
    for (const sp of soldProductRows) {
      soldProductMap.set(sp.id, sp);
    }

    // Build revenda product lookup: normalized aliases -> { costPerUnit }
    const revendaProducts = productRows.filter(p => p.category === 'revenda');
    const revendaAliasMap = new Map<string, number>();
    for (const p of revendaProducts) {
      const normName = p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
      revendaAliasMap.set(normName, Number(p.costPerUnit) || 0);
      if (p.aliases) {
        for (const alias of p.aliases.split(',')) {
          const normAlias = alias.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
          if (normAlias) revendaAliasMap.set(normAlias, Number(p.costPerUnit) || 0);
        }
      }
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

    // Complement gramages: Map<"productId-sizeTier", quantityG>
    const gramageMap = new Map<string, number>();
    for (const cg of complementGramageRows) {
      gramageMap.set(`${cg.productId}-${cg.sizeTier}`, Number(cg.quantityG));
    }

    // Find acai product ID
    const acaiProduct = productRows.find(p => p.name === 'Açaí');
    const acaiProductId = acaiProduct?.id ?? null;

    // 4. Group orders by date for daily trend
    const orderDateMap = new Map<number, string>();
    for (const o of dbOrders) {
      orderDateMap.set(o.id, o.date);
    }

    // 5. Calculate CMV for each order item
    let totalRevenue = 0;
    let totalCmv = 0;
    let unmappedItems = 0;
    const unmappedNameCounts = new Map<string, number>();

    const productStats = new Map<string, {
      soldProductId: number;
      name: string;
      qtySold: number;
      revenue: number;
      cmv: number;
    }>();

    const dailyMap = new Map<string, { revenue: number; cmv: number }>();

    /** Calculate cost from a product's weight in grams */
    function getIngredientCostG(productId: number, quantityG: number): number {
      const info = productCostMap.get(productId);
      if (!info || info.costPerUnit === 0) return 0;

      if (info.defaultUnit === 'kg') {
        return (quantityG / 1000) * info.costPerUnit;
      } else if (info.defaultUnit === 'g') {
        return quantityG * info.costPerUnit;
      } else if (info.defaultUnit === 'L') {
        return (quantityG / 1000) * info.costPerUnit;
      } else if (info.defaultUnit === 'un') {
        if (info.unitWeightG && info.unitWeightG > 0) {
          return (quantityG / info.unitWeightG) * info.costPerUnit;
        }
        return quantityG * info.costPerUnit;
      }
      return (quantityG / 1000) * info.costPerUnit;
    }

    /** Fallback: recipe-based cost for non-cup products (sucos, sorvetes, etc.) */
    function getRecipeCost(soldProductId: number): number {
      const recipeIngredients = recipeMap.get(soldProductId);
      if (!recipeIngredients || recipeIngredients.length === 0) return 0;

      let cost = 0;
      for (const ingredient of recipeIngredients) {
        cost += getIngredientCostG(ingredient.productId, Number(ingredient.quantityG));
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

      // Parse item using the stock parser
      const parsed = await parseOrderItem(item.name, tenantId);

      if (!parsed.soldProductId) {
        // Try revenda fallback: match item name against revenda product aliases
        const normItemName = item.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
        let revendaCost: number | null = null;
        if (revendaAliasMap.has(normItemName)) {
          revendaCost = revendaAliasMap.get(normItemName)!;
        } else {
          // Partial match: check if any alias is contained in the item name or vice versa
          for (const [alias, cost] of revendaAliasMap) {
            if (normItemName.includes(alias) || alias.includes(normItemName)) {
              revendaCost = cost;
              break;
            }
          }
        }

        if (revendaCost !== null) {
          const itemCmv = revendaCost * qty;
          totalCmv += itemCmv;

          const dailyEntry = dailyMap.get(date);
          if (dailyEntry) dailyEntry.cmv += itemCmv;

          const key = `revenda-${normItemName}`;
          const existing = productStats.get(key);
          if (existing) {
            existing.qtySold += qty;
            existing.revenue += itemRevenue;
            existing.cmv += itemCmv;
          } else {
            productStats.set(key, {
              soldProductId: 0,
              name: item.name,
              qtySold: qty,
              revenue: itemRevenue,
              cmv: itemCmv,
            });
          }
          continue;
        }

        unmappedItems++;
        unmappedNameCounts.set(item.name, (unmappedNameCounts.get(item.name) || 0) + 1);
        const key = `unmapped-${normItemName}`;
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

      let itemCmv = 0;
      const sp = soldProductMap.get(parsed.soldProductId);

      // Priority 1: costPrice defined on soldProduct (milkshakes, KG sorvete, etc.)
      if (sp?.costPrice) {
        itemCmv = Number(sp.costPrice) * qty;
      }
      // Priority 2: Dynamic CMV for acai cups (has sizeMl and sizeTier)
      else if (parsed.sizeMl && parsed.sizeTier) {
        const cupWeightG = CUP_WEIGHTS[parsed.sizeMl] || parsed.sizeMl;

        // Calculate complement costs and total complement weight
        let totalComplementsG = 0;
        let complementCost = 0;

        for (const compProductId of parsed.complementProductIds) {
          const compG = gramageMap.get(`${compProductId}-${parsed.sizeTier}`) ?? 0;
          if (compG > 0) {
            totalComplementsG += compG;
            complementCost += getIngredientCostG(compProductId, compG);
          }
        }

        // Acai polpa = cup weight - complements
        if (acaiProductId) {
          const polpaG = Math.max(cupWeightG - totalComplementsG, 0);
          if (polpaG > 0) {
            complementCost += getIngredientCostG(acaiProductId, polpaG);
          }
        }

        itemCmv = complementCost * qty;
      } else {
        // Fallback: recipe-based cost for non-cup products
        itemCmv = getRecipeCost(parsed.soldProductId) * qty;
      }

      totalCmv += itemCmv;

      // Track daily CMV
      const dailyEntry = dailyMap.get(date);
      if (dailyEntry) dailyEntry.cmv += itemCmv;

      // Track per-product stats
      const productKey = `sp-${parsed.soldProductId}`;
      const existing = productStats.get(productKey);
      if (existing) {
        existing.qtySold += qty;
        existing.revenue += itemRevenue;
        existing.cmv += itemCmv;
      } else {
        productStats.set(productKey, {
          soldProductId: parsed.soldProductId,
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
        hasRecipe: p.soldProductId > 0,
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
      unmappedNames: Array.from(unmappedNameCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    });
  } catch (error: any) {
    console.error('Financial API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
