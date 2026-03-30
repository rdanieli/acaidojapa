import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getTenantScope } from '@/lib/db/tenant';
import { getSubscription, getSubscriptionPayments, PLANS } from '@/lib/billing/asaas';

export async function GET() {
  try {
    const { tenantId } = await getTenantScope();
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });

    const plan = PLANS[tenant.plan as keyof typeof PLANS] || PLANS.free;
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
