import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users, tenants } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export interface SessionPayload {
  userId: number;
  tenantId: number;
  role: 'owner' | 'manager' | 'employee';
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload as unknown as SessionPayload;
}

/**
 * Short-lived (30 min) token for magic-link first login. Same JWT secret
 * but a `purpose: 'magic-link'` claim that the magic-link endpoint checks.
 */
const MAGIC_LINK_TTL = '30m';

export async function createMagicLinkToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload, purpose: 'magic-link' } as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(MAGIC_LINK_TTL)
    .sign(JWT_SECRET);
}

export async function verifyMagicLinkToken(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  if ((payload as any).purpose !== 'magic-link') {
    throw new Error('Token purpose mismatch');
  }
  const { purpose: _purpose, ...session } = payload as any;
  return session as SessionPayload;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  return session;
}

export async function authenticateUser(email: string, password: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.active, true)))
    .limit(1);

  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.id, user.tenantId), eq(tenants.active, true)))
    .limit(1);

  if (!tenant) return null;

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  return { user, tenant };
}
