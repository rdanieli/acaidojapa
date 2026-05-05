/**
 * POST /api/billing/stripe-provision
 *
 * Called by the japa-site Stripe webhook (functions/api/stripe-webhook.ts)
 * after a checkout.session.completed event. Idempotent:
 *   - if the email already maps to a tenant, updates the Stripe IDs/plan
 *   - else creates a new tenant + owner user with a random password
 *
 * Returns a short-lived magic-link token that the caller (japa-site webhook)
 * embeds in a welcome email so the new customer can sign in without a password.
 *
 * Auth: header x-provision-secret must match env PROVISION_SHARED_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenants, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, createMagicLinkToken } from '@/lib/auth';
import { randomBytes } from 'node:crypto';

interface ProvisionBody {
  email: string;
  plan?: 'starter' | 'pro';
  billing?: 'monthly' | 'annual';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function slugify(email: string): string {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const suffix = randomBytes(3).toString('hex');
  return `${base.slice(0, 16)}-${suffix}`;
}

export async function POST(request: NextRequest) {
  const expected = process.env.PROVISION_SHARED_SECRET;
  if (!expected) {
    console.error('[stripe-provision] PROVISION_SHARED_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const provided = request.headers.get('x-provision-secret');
  if (!provided || provided !== expected) return unauthorized();

  let body: ProvisionBody;
  try {
    body = (await request.json()) as ProvisionBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }
  const plan = body.plan === 'pro' ? 'pro' : 'starter';

  try {
    const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser) {
      // Existing customer (re-subscribed or upgraded). Update Stripe IDs and plan.
      await db
        .update(tenants)
        .set({
          plan,
          stripeCustomerId: body.stripeCustomerId ?? null,
          stripeSubscriptionId: body.stripeSubscriptionId ?? null,
          stripePriceId: body.stripePriceId ?? null,
          billingStatus: 'active',
        })
        .where(eq(tenants.id, existingUser.tenantId));

      const magicLinkToken = await createMagicLinkToken({
        userId: existingUser.id,
        tenantId: existingUser.tenantId,
        role: existingUser.role as 'owner' | 'manager' | 'employee',
        email: existingUser.email,
      });
      return NextResponse.json({
        provisioned: false,
        existed: true,
        userId: existingUser.id,
        tenantId: existingUser.tenantId,
        magicLinkToken,
      });
    }

    // New customer — create tenant + owner. Random password since they'll come in via magic link.
    const slug = slugify(email);
    const businessName = email.split('@')[0];
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: businessName,
        slug,
        plan,
        billingStatus: 'active',
        stripeCustomerId: body.stripeCustomerId ?? null,
        stripeSubscriptionId: body.stripeSubscriptionId ?? null,
        stripePriceId: body.stripePriceId ?? null,
      })
      .returning();

    const randomPassword = randomBytes(24).toString('base64url');
    const passwordHash = await hashPassword(randomPassword);
    const [user] = await db
      .insert(users)
      .values({
        tenantId: tenant.id,
        email,
        name: businessName,
        passwordHash,
        passwordIsTemporary: true,
        role: 'owner',
      })
      .returning();

    const magicLinkToken = await createMagicLinkToken({
      userId: user.id,
      tenantId: tenant.id,
      role: 'owner',
      email: user.email,
    });

    console.log('[stripe-provision] Created tenant', { tenantId: tenant.id, email, plan, utm: body.utm });

    return NextResponse.json({
      provisioned: true,
      existed: false,
      userId: user.id,
      tenantId: tenant.id,
      magicLinkToken,
    });
  } catch (error: any) {
    if (error?.code === '23505') {
      console.warn('[stripe-provision] Duplicate (race) — fetching and returning magic link', { email });
      const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (u) {
        const magicLinkToken = await createMagicLinkToken({
          userId: u.id,
          tenantId: u.tenantId,
          role: u.role as 'owner' | 'manager' | 'employee',
          email: u.email,
        });
        return NextResponse.json({ provisioned: false, existed: true, userId: u.id, tenantId: u.tenantId, magicLinkToken });
      }
    }
    console.error('[stripe-provision] Error:', error);
    return NextResponse.json({ error: 'Provisioning failed' }, { status: 500 });
  }
}
