import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, inventoryItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const all = await db.select().from(products).orderBy(products.name);
    return NextResponse.json({ products: all });
  } catch (error) {
    console.error('[Products API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, aliases, defaultUnit, category, unitWeightG, minStock, costPerUnit } = await request.json();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const [product] = await db
      .insert(products)
      .values({
        name,
        aliases: aliases || null,
        defaultUnit: defaultUnit || 'un',
        category: category || null,
        unitWeightG: unitWeightG != null ? String(unitWeightG) : null,
        minStock: minStock != null ? String(minStock) : null,
        costPerUnit: costPerUnit != null ? String(costPerUnit) : null,
      })
      .returning();

    return NextResponse.json({ product });
  } catch (error) {
    console.error('[Products API] Error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, aliases, defaultUnit, active, category, unitWeightG, minStock, costPerUnit } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (aliases !== undefined) updates.aliases = aliases || null;
    if (defaultUnit !== undefined) updates.defaultUnit = defaultUnit;
    if (active !== undefined) updates.active = active;
    if (category !== undefined) updates.category = category || null;
    if (unitWeightG !== undefined) updates.unitWeightG = unitWeightG != null ? String(unitWeightG) : null;
    if (minStock !== undefined) updates.minStock = minStock != null ? String(minStock) : null;
    if (costPerUnit !== undefined) updates.costPerUnit = costPerUnit != null ? String(costPerUnit) : null;

    const [updated] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, Number(id)))
      .returning();

    return NextResponse.json({ product: updated });
  } catch (error) {
    console.error('[Products API] Error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { sourceId, targetId } = await request.json();
    if (!sourceId || !targetId) return NextResponse.json({ error: 'sourceId and targetId required' }, { status: 400 });

    // Get both products
    const [source] = await db.select().from(products).where(eq(products.id, Number(sourceId)));
    const [target] = await db.select().from(products).where(eq(products.id, Number(targetId)));
    if (!source || !target) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    // Move inventory items from source to target
    await db
      .update(inventoryItems)
      .set({ productId: Number(targetId) })
      .where(eq(inventoryItems.productId, Number(sourceId)));

    // Merge aliases
    const sourceNames = [source.name, ...(source.aliases ? source.aliases.split(',').map((a: string) => a.trim()) : [])];
    const targetAliases = target.aliases ? target.aliases.split(',').map((a: string) => a.trim()) : [];
    const merged = [...new Set([...targetAliases, ...sourceNames])].join(', ');

    await db.update(products).set({ aliases: merged }).where(eq(products.id, Number(targetId)));

    // Deactivate source
    await db.update(products).set({ active: false }).where(eq(products.id, Number(sourceId)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Products API] Merge error:', error);
    return NextResponse.json({ error: 'Failed to merge products' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    await db.delete(products).where(eq(products.id, Number(id)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Products API] Error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
