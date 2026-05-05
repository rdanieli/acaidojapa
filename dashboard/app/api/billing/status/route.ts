import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getTenantScope } from '@/lib/db/tenant';
import { getSubscription, getSubscriptionPayments, PLANS } from '@/lib/billing/asaas';
import { getStripe } from '@/lib/billing/stripe';

export async function GET() {
  try {
    const { tenantId } = await getTenantScope();
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });

    const plan = PLANS[tenant.plan as keyof typeof PLANS] || PLANS.free;

    // Stripe path (new tenants, signed up via japagestao.com.br checkout)
    if (tenant.stripeSubscriptionId) {
      try {
        const stripeSub = await getStripe().subscriptions.retrieve(tenant.stripeSubscriptionId, {
          expand: ['default_payment_method'],
        });
        const pm: any = stripeSub.default_payment_method;
        const card = pm && typeof pm === 'object' && pm.card
          ? { last4: pm.card.last4, brand: pm.card.brand }
          : null;

        const periodEnd = (stripeSub as any).current_period_end
          ? new Date((stripeSub as any).current_period_end * 1000).toISOString()
          : null;

        return NextResponse.json({
          provider: 'stripe',
          plan: tenant.plan,
          planName: plan.name,
          planValue: plan.value,
          planFeatures: plan.features,
          billingStatus: tenant.billingStatus,
          card,
          subscription: {
            id: stripeSub.id,
            status: stripeSub.status,
            cancel_at_period_end: stripeSub.cancel_at_period_end,
            current_period_end: periodEnd,
            trial_end: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null,
          },
          payments: [],
        });
      } catch (err) {
        console.warn('[billing/status] Stripe fetch failed:', (err as Error).message);
        // fall through to a basic response so UI doesn't break
        return NextResponse.json({
          provider: 'stripe',
          plan: tenant.plan,
          planName: plan.name,
          planValue: plan.value,
          planFeatures: plan.features,
          billingStatus: tenant.billingStatus,
          card: null,
          subscription: null,
          payments: [],
        });
      }
    }

    // Legacy Asaas path
    let subscription = null;
    let payments: any[] = [];

    if (tenant.asaasSubscriptionId) {
      try {
        subscription = await getSubscription(tenant.asaasSubscriptionId);
        const payData = await getSubscriptionPayments(tenant.asaasSubscriptionId);
        payments = payData?.data || [];
      } catch {}
    }

    return NextResponse.json({
      provider: 'asaas',
      plan: tenant.plan,
      planName: plan.name,
      planValue: plan.value,
      planFeatures: plan.features,
      billingStatus: tenant.billingStatus,
      card: tenant.asaasCardToken ? {
        last4: tenant.asaasCardLast4,
        brand: tenant.asaasCardBrand,
      } : null,
      subscription,
      payments: payments.slice(0, 10),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
