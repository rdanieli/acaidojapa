import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  products,
  inventoryItems,
  stockMovements,
  recipes,
  complementGramages,
  consolidationItems,
  wasteEntries,
  stockAlerts,
  pendingAdminCommands,
} from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import { getTenantScope } from '@/lib/db/tenant';

type ProductScopedTable = PgTable & { productId: AnyPgColumn; tenantId: AnyPgColumn };

const PRODUCT_DEPENDENTS: { key: string; table: ProductScopedTable }[] = [
  { key: 'stockMovements', table: stockMovements },
  { key: 'recipes', table: recipes },
  { key: 'complementGramages', table: complementGramages },
  { key: 'consolidationItems', table: consolidationItems },
  { key: 'wasteEntries', table: wasteEntries },
  { key: 'stockAlerts', table: stockAlerts },
  { key: 'pendingAdminCommands', table: pendingAdminCommands },
];

async function countProductDependencies(productId: number, tenantId: number) {
  const counts: Record<string, number> = {};

  for (const dependent of [...PRODUCT_DEPENDENTS, { key: 'inventoryItems', table: inventoryItems as ProductScopedTable }]) {
    const [row] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(dependent.table)
      .where(and(eq(dependent.table.productId, productId), eq(dependent.table.tenantId, tenantId)));
    if (row.total > 0) counts[dependent.key] = row.total;
  }

  return counts;
}

export async function GET() {
  try {
    const { tenantId } = await getTenantScope();
    const all = await db.select().from(products).where(eq(products.tenantId, tenantId)).orderBy(products.name);
    return NextResponse.json({ products: all });
  } catch (error) {
    console.error('[Products API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { name, aliases, defaultUnit, category, unitWeightG, minStock, costPerUnit } = await request.json();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const [product] = await db
      .insert(products)
      .values({
        tenantId,
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
    const { tenantId } = await getTenantScope();
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
      .where(and(eq(products.id, Number(id)), eq(products.tenantId, tenantId)))
      .returning();

    return NextResponse.json({ product: updated });
  } catch (error) {
    console.error('[Products API] Error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { sourceId, targetId } = await request.json();
    if (!sourceId || !targetId) return NextResponse.json({ error: 'sourceId and targetId required' }, { status: 400 });

    // Get both products
    const [source] = await db.select().from(products).where(and(eq(products.id, Number(sourceId)), eq(products.tenantId, tenantId)));
    const [target] = await db.select().from(products).where(and(eq(products.id, Number(targetId)), eq(products.tenantId, tenantId)));
    if (!source || !target) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    // Move inventory items from source to target
    await db
      .update(inventoryItems)
      .set({ productId: Number(targetId) })
      .where(and(eq(inventoryItems.productId, Number(sourceId)), eq(inventoryItems.tenantId, tenantId)));

    // Merge aliases
    const sourceNames = [source.name, ...(source.aliases ? source.aliases.split(',').map((a: string) => a.trim()) : [])];
    const targetAliases = target.aliases ? target.aliases.split(',').map((a: string) => a.trim()) : [];
    const merged = [...new Set([...targetAliases, ...sourceNames])].join(', ');

    await db.update(products).set({ aliases: merged }).where(and(eq(products.id, Number(targetId)), eq(products.tenantId, tenantId)));

    // Deactivate source
    await db.update(products).set({ active: false }).where(and(eq(products.id, Number(sourceId)), eq(products.tenantId, tenantId)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Products API] Merge error:', error);
    return NextResponse.json({ error: 'Failed to merge products' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const force = searchParams.get('force') === '1';
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const productId = Number(id);
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)));
    if (!product) return NextResponse.json({ error: 'Produto nao encontrado' }, { status: 404 });

    const dependencies = await countProductDependencies(productId, tenantId);

    if (Object.keys(dependencies).length > 0 && !force) {
      return NextResponse.json(
        { error: 'Produto tem vinculos', productName: product.name, dependencies },
        { status: 409 }
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(inventoryItems)
        .set({ productId: null })
        .where(and(eq(inventoryItems.productId, productId), eq(inventoryItems.tenantId, tenantId)));

      for (const dependent of PRODUCT_DEPENDENTS) {
        await tx
          .delete(dependent.table)
          .where(and(eq(dependent.table.productId, productId), eq(dependent.table.tenantId, tenantId)));
      }

      await tx.delete(products).where(and(eq(products.id, productId), eq(products.tenantId, tenantId)));
    });

    return NextResponse.json({ ok: true, dependencies });
  } catch (error) {
    console.error('[Products API] Error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
