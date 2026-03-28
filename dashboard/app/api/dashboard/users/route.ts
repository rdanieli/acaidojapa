import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTenantScope, requireRole } from '@/lib/db/tenant';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getTenantScope();
    requireRole(session, 'manager');
    const all = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      phone: users.phone,
      active: users.active,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.tenantId, session.tenantId));
    return NextResponse.json({ users: all });
  } catch (error: any) {
    console.error('[Users API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getTenantScope();
    requireRole(session, 'owner');
    const { name, email, password, role, phone } = await request.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'name, email, password obrigatórios' }, { status: 400 });
    }
    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(users).values({
      tenantId: session.tenantId,
      name,
      email,
      passwordHash,
      role: role || 'employee',
      phone: phone || null,
    }).returning();
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Email já em uso' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getTenantScope();
    requireRole(session, 'owner');
    const { id, role, active, name, phone } = await request.json();
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    const updates: any = {};
    if (role !== undefined) updates.role = role;
    if (active !== undefined) updates.active = active;
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    const [updated] = await db.update(users).set(updates)
      .where(and(eq(users.id, id), eq(users.tenantId, session.tenantId)))
      .returning();
    return NextResponse.json({ user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
