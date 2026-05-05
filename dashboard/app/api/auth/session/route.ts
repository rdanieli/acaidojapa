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

    const [tenantRow] = await db.select({
      name: tenants.name,
      slug: tenants.slug,
      onboardingCompleted: tenants.onboardingCompleted,
      stripeSubscriptionId: tenants.stripeSubscriptionId,
      billingStatus: tenants.billingStatus,
    }).from(tenants).where(eq(tenants.id, session.tenantId)).limit(1);

    const tenant = tenantRow
      ? {
          name: tenantRow.name,
          slug: tenantRow.slug,
          onboardingCompleted: tenantRow.onboardingCompleted,
          billingStatus: tenantRow.billingStatus,
          // True when the tenant signed up via the Stripe landing flow.
          // Used by /onboarding to skip the Asaas card-tokenization step.
          hasStripeSubscription: !!tenantRow.stripeSubscriptionId,
        }
      : null;

    // Fetch user's allowed modules and name
    let allowedModules: string[] | null = null;
    let name: string | null = null;
    if (session.userId > 0) {
      const [user] = await db.select({ allowedModules: users.allowedModules, name: users.name })
        .from(users).where(eq(users.id, session.userId)).limit(1);
      allowedModules = (user?.allowedModules as string[] | null) || null;
      name = user?.name || null;
    }

    return NextResponse.json({
      session: {
        userId: session.userId,
        tenantId: session.tenantId,
        role: session.role,
        email: session.email,
        name,
        allowedModules,
        tenant: tenant || null,
      },
    });
  } catch {
    return NextResponse.json({ session: null });
  }
}
