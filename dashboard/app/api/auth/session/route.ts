import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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

    return NextResponse.json({
      session: {
        userId: session.userId,
        tenantId: session.tenantId,
        role: session.role,
        email: session.email,
        tenant: tenant || null,
      },
    });
  } catch {
    return NextResponse.json({ session: null });
  }
}
