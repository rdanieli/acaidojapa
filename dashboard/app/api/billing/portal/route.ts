/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Billing Portal session for the authenticated tenant
 * and returns the URL. The browser redirects there so the customer can
 * update card, view invoices, or cancel subscription in Stripe-hosted UI
 * (no PCI exposure on our side).
 *
 * Requires the tenant to have `stripeCustomerId` set — i.e. they signed up
 * via the Stripe checkout flow on the landing. Legacy Asaas tenants get
 * a 400 with a clear message.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getTenantScope } from '@/lib/db/tenant';
import { getStripe } from '@/lib/billing/stripe';

const DEFAULT_RETURN_URL = 'https://app.japagestao.com.br/configuracoes';

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });

    if (!tenant.stripeCustomerId) {
      return NextResponse.json(
        { error: 'Sua conta não está vinculada ao Stripe. Suporte em contato@japagestao.com.br.' },
        { status: 400 },
      );
    }

    const returnUrl = (() => {
      const fromHeader = request.headers.get('x-forwarded-host') || request.headers.get('host');
      const proto = request.headers.get('x-forwarded-proto') || 'https';
      if (fromHeader && !fromHeader.startsWith('0.0.0.0') && !fromHeader.startsWith('localhost')) {
        return `${proto}://${fromHeader}/configuracoes`;
      }
      return process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/configuracoes`
        : DEFAULT_RETURN_URL;
    })();

    const session = await getStripe().billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[Billing Portal] Error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Falha ao abrir portal' },
      { status: 500 },
    );
  }
}
