import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { locations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTenantScope, requireRole } from '@/lib/db/tenant';

export async function GET() {
  try {
    const { tenantId } = await getTenantScope();
    const all = await db.select().from(locations)
      .where(eq(locations.tenantId, tenantId))
      .orderBy(locations.name);
    return NextResponse.json({ locations: all });
  } catch (error: any) {
    console.error('[Locations API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getTenantScope();
    requireRole(session, 'owner');
    const { name, address, phone } = await request.json();
    if (!name) return NextResponse.json({ error: 'name obrigatório' }, { status: 400 });
    const [location] = await db.insert(locations).values({
      tenantId: session.tenantId,
      name,
      address: address || null,
      phone: phone || null,
    }).returning();
    return NextResponse.json({ location });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getTenantScope();
    requireRole(session, 'owner');
    const { id, name, address, phone, active } = await request.json();
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (active !== undefined) updates.active = active;
    const [updated] = await db.update(locations).set(updates)
      .where(and(eq(locations.id, id), eq(locations.tenantId, session.tenantId)))
      .returning();
    return NextResponse.json({ location: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
