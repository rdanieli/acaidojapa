import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { tenants, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ session: null });
    }

    const [tenant] = await db.select({
      name: tenants.name,
      slug: tenants.slug,
      onboardingCompleted: tenants.onboardingCompleted,
    }).from(tenants).where(eq(tenants.id, session.tenantId)).limit(1);

    // Fetch user's allowed modules
    let allowedModules: string[] | null = null;
    if (session.userId > 0) {
      const [user] = await db.select({ allowedModules: users.allowedModules })
        .from(users).where(eq(users.id, session.userId)).limit(1);
      allowedModules = (user?.allowedModules as string[] | null) || null;
    }

    return NextResponse.json({
      session: {
        userId: session.userId,
        tenantId: session.tenantId,
        role: session.role,
        email: session.email,
        allowedModules,
        tenant: tenant || null,
      },
    });
  } catch {
    return NextResponse.json({ session: null });
  }
}
