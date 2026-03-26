import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { complementGramages } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 });

    const gramages = await db
      .select()
      .from(complementGramages)
      .where(eq(complementGramages.productId, Number(productId)));

    return NextResponse.json({ gramages });
  } catch (error) {
    console.error('[Complement Gramages API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch gramages' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { productId, gramages } = await request.json();
    if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    if (!gramages || !Array.isArray(gramages)) return NextResponse.json({ error: 'gramages array is required' }, { status: 400 });

    const results = [];

    for (const { sizeTier, quantityG } of gramages) {
      if (!sizeTier) continue;

      const [existing] = await db
        .select()
        .from(complementGramages)
        .where(and(
          eq(complementGramages.productId, Number(productId)),
          eq(complementGramages.sizeTier, sizeTier),
        ));

      if (Number(quantityG) === 0) {
        // Delete row if quantityG is 0
        if (existing) {
          await db
            .delete(complementGramages)
            .where(eq(complementGramages.id, existing.id));
        }
      } else if (existing) {
        // Update existing row
        const [updated] = await db
          .update(complementGramages)
          .set({ quantityG: String(quantityG) })
          .where(eq(complementGramages.id, existing.id))
          .returning();
        results.push(updated);
      } else {
        // Insert new row
        const [inserted] = await db
          .insert(complementGramages)
          .values({
            productId: Number(productId),
            sizeTier,
            quantityG: String(quantityG),
          })
          .returning();
        results.push(inserted);
      }
    }

    return NextResponse.json({ gramages: results });
  } catch (error) {
    console.error('[Complement Gramages API] Error:', error);
    return NextResponse.json({ error: 'Failed to update gramages' }, { status: 500 });
  }
}
