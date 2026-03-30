import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = body.event;
    const payment = body.payment;

    if (!event || !payment) {
      return NextResponse.json({ ok: true });
    }

    console.log(`[Asaas Webhook] Event: ${event}, Payment: ${payment.id}, Status: ${payment.status}`);

    // Find tenant by subscription or externalReference
    const subscriptionId = payment.subscription;
    const externalRef = payment.externalReference || '';

    let tenantId: number | null = null;

    if (subscriptionId) {
      const [tenant] = await db.select({ id: tenants.id }).from(tenants)
        .where(eq(tenants.asaasSubscriptionId, subscriptionId)).limit(1);
      if (tenant) tenantId = tenant.id;
    }

    if (!tenantId && externalRef.startsWith('tenant-')) {
      const parts = externalRef.split('-');
      tenantId = Number(parts[1]) || null;
    }

    if (!tenantId) {
      console.log('[Asaas Webhook] Could not resolve tenant');
      return NextResponse.json({ ok: true });
    }

    // Update billing status based on event
    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        await db.update(tenants).set({ billingStatus: 'active' }).where(eq(tenants.id, tenantId));
        break;
      case 'PAYMENT_OVERDUE':
        await db.update(tenants).set({ billingStatus: 'past_due' }).where(eq(tenants.id, tenantId));
        break;
      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
        // Don't change status for individual payment events
        break;
      case 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED':
        await db.update(tenants).set({ billingStatus: 'past_due' }).where(eq(tenants.id, tenantId));
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[Asaas Webhook] Error:', error);
    return NextResponse.json({ ok: true }); // Always return 200 to Asaas
  }
}
