import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getTenantScope, requireRole } from '@/lib/db/tenant';
import { createSubscription, cancelSubscription, PLANS, type PlanId } from '@/lib/billing/asaas';

export async function POST(request: NextRequest) {
  try {
    const session = await getTenantScope();
    requireRole(session, 'owner');
    const { plan } = await request.json();

    if (!plan || !PLANS[plan as PlanId]) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    const planData = PLANS[plan as PlanId];
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, session.tenantId)).limit(1);
    if (!tenant) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });

    if (!tenant.asaasCustomerId || !tenant.asaasCardToken) {
      return NextResponse.json({ error: 'Cartão não cadastrado. Adicione um cartão primeiro.' }, { status: 400 });
    }

    // Cancel existing subscription if any
    if (tenant.asaasSubscriptionId) {
      try { await cancelSubscription(tenant.asaasSubscriptionId); } catch {}
    }

    if (plan === 'free') {
      // Downgrade to free — just cancel subscription
      await db.update(tenants).set({
        plan: 'free',
        asaasSubscriptionId: null,
        billingStatus: 'trial',
      }).where(eq(tenants.id, session.tenantId));
      return NextResponse.json({ ok: true, plan: 'free' });
    }

    // Create new subscription
    const sub = await createSubscription({
      customerId: tenant.asaasCustomerId,
      creditCardToken: tenant.asaasCardToken,
      value: planData.value,
      description: `Japa Gestão — Plano ${planData.name}`,
      externalReference: `tenant-${session.tenantId}-${plan}`,
    });

    await db.update(tenants).set({
      plan,
      asaasSubscriptionId: sub.id,
      billingStatus: 'active',
    }).where(eq(tenants.id, session.tenantId));

    return NextResponse.json({ ok: true, plan, subscriptionId: sub.id });
  } catch (error: any) {
    console.error('[Billing Subscribe] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
