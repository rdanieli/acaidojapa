import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { suppliers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTenantScope } from '@/lib/db/tenant';

export async function GET() {
  try {
    const { tenantId } = await getTenantScope();
    const all = await db.select().from(suppliers)
      .where(eq(suppliers.tenantId, tenantId))
      .orderBy(suppliers.name);
    return NextResponse.json({ suppliers: all });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { name, phone, email, notes } = await request.json();
    if (!name) return NextResponse.json({ error: 'name obrigatório' }, { status: 400 });
    const [supplier] = await db.insert(suppliers).values({
      tenantId, name, phone: phone || null, email: email || null, notes: notes || null,
    }).returning();
    return NextResponse.json({ supplier });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { id, name, phone, email, notes, active } = await request.json();
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone || null;
    if (email !== undefined) updates.email = email || null;
    if (notes !== undefined) updates.notes = notes || null;
    if (active !== undefined) updates.active = active;
    const [updated] = await db.update(suppliers).set(updates)
      .where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
      .returning();
    return NextResponse.json({ supplier: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    await db.delete(suppliers)
      .where(and(eq(suppliers.id, Number(id)), eq(suppliers.tenantId, tenantId)));
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
