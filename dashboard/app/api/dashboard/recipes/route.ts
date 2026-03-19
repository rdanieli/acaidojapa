import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recipes, soldProducts, products } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const soldProductId = searchParams.get('soldProductId');

    if (soldProductId) {
      // Get recipe for specific sold product with product details
      const recipeItems = await db
        .select({
          id: recipes.id,
          soldProductId: recipes.soldProductId,
          productId: recipes.productId,
          productName: products.name,
          productUnit: products.defaultUnit,
          costPerUnit: products.costPerUnit,
          unitWeightG: products.unitWeightG,
          quantityG: recipes.quantityG,
          isBase: recipes.isBase,
          notes: recipes.notes,
        })
        .from(recipes)
        .leftJoin(products, eq(recipes.productId, products.id))
        .where(eq(recipes.soldProductId, Number(soldProductId)));

      return NextResponse.json({ recipe: recipeItems });
    }

    // List all sold products with ingredient count
    const result = await db
      .select({
        id: soldProducts.id,
        name: soldProducts.name,
        sizeMl: soldProducts.sizeMl,
        category: soldProducts.category,
        price: soldProducts.price,
        active: soldProducts.active,
        ingredientCount: sql<number>`(SELECT COUNT(*) FROM recipes WHERE recipes.sold_product_id = ${soldProducts.id})`.as('ingredient_count'),
      })
      .from(soldProducts)
      .orderBy(soldProducts.name);

    return NextResponse.json({ soldProducts: result });
  } catch (error) {
    console.error('[Recipes API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { soldProductId, items } = await request.json();
    if (!soldProductId || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'soldProductId and items array required' }, { status: 400 });
    }

    // Delete existing recipe items
    await db.delete(recipes).where(eq(recipes.soldProductId, Number(soldProductId)));

    // Insert new items
    if (items.length > 0) {
      await db.insert(recipes).values(
        items.map((item: any) => ({
          soldProductId: Number(soldProductId),
          productId: Number(item.productId),
          quantityG: String(item.quantityG),
          isBase: item.isBase ?? false,
          notes: item.notes || null,
        }))
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Recipes API] Error:', error);
    return NextResponse.json({ error: 'Failed to save recipe' }, { status: 500 });
  }
}
