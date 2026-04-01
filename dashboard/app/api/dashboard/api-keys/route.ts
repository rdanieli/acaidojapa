import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiKeys } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTenantScope, requireRole } from '@/lib/db/tenant';
import crypto from 'crypto';

export async function GET() {
  try {
    const session = await getTenantScope();
    requireRole(session, 'owner');
    const keys = await db.select({
      id: apiKeys.id,
      name: apiKeys.name,
      key: apiKeys.key,
      active: apiKeys.active,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    }).from(apiKeys).where(eq(apiKeys.tenantId, session.tenantId));
    return NextResponse.json({ keys });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getTenantScope();
    requireRole(session, 'owner');
    const { name } = await request.json().catch(() => ({ name: 'default' }));
    const key = 'tng_k_' + crypto.randomBytes(16).toString('hex');
    const [apiKey] = await db.insert(apiKeys).values({
      tenantId: session.tenantId,
      key,
      name: name || 'default',
    }).returning();
    return NextResponse.json({ apiKey });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getTenantScope();
    requireRole(session, 'owner');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await db.update(apiKeys).set({ active: false })
      .where(and(eq(apiKeys.id, Number(id)), eq(apiKeys.tenantId, session.tenantId)));
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
