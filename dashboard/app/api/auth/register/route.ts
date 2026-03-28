import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenants, users } from '@/lib/db/schema';
import { hashPassword, createToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { businessName, slug, name, email, password, phone } = await request.json();
    if (!businessName || !slug || !name || !email || !password) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }
    const [tenant] = await db.insert(tenants).values({
      name: businessName,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
    }).returning();
    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(users).values({
      tenantId: tenant.id,
      email,
      name,
      passwordHash,
      role: 'owner',
      phone: phone || null,
    }).returning();
    const token = await createToken({
      userId: user.id,
      tenantId: tenant.id,
      role: 'owner',
      email: user.email,
    });
    const response = NextResponse.json({ ok: true, tenantId: tenant.id });
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });
    return response;
  } catch (error: any) {
    console.error('[Register] Error:', error);
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Email ou slug já em uso' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
