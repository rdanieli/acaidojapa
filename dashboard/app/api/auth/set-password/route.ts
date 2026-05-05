/**
 * POST /api/auth/set-password
 *
 * Used when a Stripe-provisioned user (whose initial password is a random
 * server-generated string they don't know) defines their own password
 * during the onboarding flow. After this, they can log in via /login.
 *
 * Auth: existing session (the magic-link cookie set by /api/auth/magic-link).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession, hashPassword } from '@/lib/auth';

const MIN_LENGTH = 8;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { password } = await request.json();
    if (typeof password !== 'string' || password.length < MIN_LENGTH) {
      return NextResponse.json(
        { error: `A senha precisa ter pelo menos ${MIN_LENGTH} caracteres.` },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(password);
    await db
      .update(users)
      .set({ passwordHash, passwordIsTemporary: false })
      .where(eq(users.id, session.userId));

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[set-password] Error:', error?.message || error);
    return NextResponse.json({ error: 'Falha ao salvar senha' }, { status: 500 });
  }
}
