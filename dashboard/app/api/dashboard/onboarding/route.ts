import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenants, products, soldProducts, complementGramages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getTenantScope } from '@/lib/db/tenant';

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { products: productList, soldProductsList, gramages } = await request.json();

    // 1. Create products (ingredients/complements)
    const createdProducts: Record<string, number> = {};
    if (productList?.length) {
      for (const p of productList) {
        const [product] = await db.insert(products).values({
          tenantId,
          name: p.name,
          defaultUnit: p.unit || 'g',
          category: p.category || 'complemento',
        }).returning();
        createdProducts[p.name] = product.id;
      }
    }

    // 2. Create sold products (menu items)
    if (soldProductsList?.length) {
      for (const sp of soldProductsList) {
        await db.insert(soldProducts).values({
          tenantId,
          name: sp.name,
          sizeMl: sp.sizeMl || null,
          category: sp.category || 'acai',
          price: sp.price ? String(sp.price) : null,
        });
      }
    }

    // 3. Create complement gramages
    if (gramages?.length) {
      for (const g of gramages) {
        const productId = createdProducts[g.productName];
        if (!productId) continue;
        for (const tier of ['small', 'medium', 'large']) {
          if (g[tier]) {
            await db.insert(complementGramages).values({
              tenantId,
              productId,
              sizeTier: tier,
              quantityG: String(g[tier]),
            });
          }
        }
      }
    }

    // 4. Mark onboarding as completed
    await db.update(tenants)
      .set({ onboardingCompleted: true })
      .where(eq(tenants.id, tenantId));

    return NextResponse.json({
      ok: true,
      productsCreated: Object.keys(createdProducts).length,
      soldProductsCreated: soldProductsList?.length || 0,
    });
  } catch (error: any) {
    console.error('[Onboarding API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { tenantId } = await getTenantScope();
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    return NextResponse.json({ completed: tenant?.onboardingCompleted ?? false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
