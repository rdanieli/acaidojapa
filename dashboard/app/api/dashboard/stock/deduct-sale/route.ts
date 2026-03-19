import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recipes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { deductProductStock } from '@/lib/stock/deduct-stock';

export async function POST(request: NextRequest) {
  try {
    const { soldProductId, quantity, complementIds } = await request.json();
    if (!soldProductId || !quantity) {
      return NextResponse.json({ error: 'soldProductId and quantity required' }, { status: 400 });
    }

    const qty = Number(quantity);

    // Get recipe for this sold product
    const recipeItems = await db
      .select()
      .from(recipes)
      .where(eq(recipes.soldProductId, Number(soldProductId)));

    if (recipeItems.length === 0) {
      return NextResponse.json({ error: 'No recipe found for this product' }, { status: 404 });
    }

    const movements = [];

    for (const item of recipeItems) {
      const totalG = Number(item.quantityG) * qty;
      const movement = await deductProductStock(item.productId, totalG, 'sale', Number(soldProductId));
      if (movement) movements.push(movement);
    }

    // Handle complements if provided
    if (complementIds && Array.isArray(complementIds)) {
      for (const compId of complementIds) {
        const compRecipeItems = await db
          .select()
          .from(recipes)
          .where(eq(recipes.soldProductId, Number(compId)));

        for (const item of compRecipeItems) {
          const totalG = Number(item.quantityG) * qty;
          await deductProductStock(item.productId, totalG, 'sale', Number(compId));
        }
      }
    }

    return NextResponse.json({ ok: true, movements });
  } catch (error) {
    console.error('[Deduct Sale API] Error:', error);
    return NextResponse.json({ error: 'Failed to deduct sale' }, { status: 500 });
  }
}
