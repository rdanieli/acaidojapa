import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getTenantScope } from '@/lib/db/tenant';
import { createCustomer, tokenizeCard } from '@/lib/billing/asaas';

export async function POST(request: NextRequest) {
  try {
    const { tenantId, email } = await getTenantScope();
    const { card, holderInfo } = await request.json();

    if (!card?.number || !card?.holderName || !card?.expiryMonth || !card?.expiryYear || !card?.ccv) {
      return NextResponse.json({ error: 'Dados do cartão incompletos' }, { status: 400 });
    }
    if (!holderInfo?.cpfCnpj || !holderInfo?.postalCode || !holderInfo?.phone) {
      return NextResponse.json({ error: 'Dados do titular incompletos' }, { status: 400 });
    }

    // Get tenant
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });

    // Defense: tenants that signed up via Stripe Checkout already have an active
    // subscription with payment method on file at Stripe. They should never see
    // this flow — block it explicitly so a stray request doesn't try to tokenize
    // a card via Asaas (which isn't even configured in prod).
    if (tenant.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'Cobrança gerenciada pelo Stripe — esse formulário não se aplica' },
        { status: 400 },
      );
    }

    // Create Asaas customer if doesn't exist
    let customerId: string = tenant.asaasCustomerId || '';
    if (!customerId) {
      const customer = await createCustomer({
        name: holderInfo.name || tenant.name,
        cpfCnpj: holderInfo.cpfCnpj,
        email,
        phone: holderInfo.phone,
        externalReference: `tenant-${tenantId}`,
      });
      customerId = customer.id;
    }

    // Tokenize card
    const result = await tokenizeCard(customerId, card, {
      name: holderInfo.name || tenant.name,
      email,
      cpfCnpj: holderInfo.cpfCnpj,
      postalCode: holderInfo.postalCode,
      addressNumber: holderInfo.addressNumber || '0',
      phone: holderInfo.phone,
    });

    // Save to tenant
    await db.update(tenants).set({
      asaasCustomerId: customerId,
      asaasCardToken: result.creditCardToken,
      asaasCardLast4: result.creditCardNumber,
      asaasCardBrand: result.creditCardBrand,
    }).where(eq(tenants.id, tenantId));

    return NextResponse.json({
      ok: true,
      card: {
        last4: result.creditCardNumber,
        brand: result.creditCardBrand,
      },
    });
  } catch (error: any) {
    console.error('[Billing Tokenize] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
