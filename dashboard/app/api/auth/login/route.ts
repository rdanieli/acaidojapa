import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 });
    }

    // Fallback to env-var auth for backward compatibility
    const envUser = process.env.DASHBOARD_USER;
    const envPass = process.env.DASHBOARD_PASS;
    if (envUser && envPass && email === envUser && password === envPass) {
      const token = await createToken({
        userId: 0,
        tenantId: 1,
        role: 'owner',
        email: envUser,
      });
      const response = NextResponse.json({ ok: true });
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400,
        path: '/',
      });
      return response;
    }

    const result = await authenticateUser(email, password);
    if (!result) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const { user, tenant } = result;
    const token = await createToken({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role as 'owner' | 'manager' | 'employee',
      email: user.email,
    });

    const response = NextResponse.json({ ok: true, user: { name: user.name, role: user.role } });
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('[Login] Error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
