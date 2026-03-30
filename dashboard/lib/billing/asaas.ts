/**
 * Asaas Payment Gateway Client
 *
 * Handles customer creation, card tokenization, subscriptions, and charges.
 * Card data is NEVER stored in our DB — only Asaas tokens.
 *
 * Env vars:
 *   ASAAS_API_KEY — API key (sandbox or production)
 *   ASAAS_SANDBOX — "true" for sandbox, anything else for production
 */

const BASE_URL = () =>
  process.env.ASAAS_SANDBOX === 'true'
    ? 'https://sandbox.asaas.com/api/v3'
    : 'https://api.asaas.com/api/v3';

const API_KEY = () => process.env.ASAAS_API_KEY || '';

async function asaasRequest(method: string, path: string, body?: any) {
  const res = await fetch(`${BASE_URL()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      access_token: API_KEY(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    const errorMsg = data?.errors?.map((e: any) => e.description).join(', ') || JSON.stringify(data);
    throw new Error(`Asaas API error (${res.status}): ${errorMsg}`);
  }

  return data;
}

// --- Customers ---

export interface CreateCustomerParams {
  name: string;
  cpfCnpj: string;
  email: string;
  phone?: string;
  externalReference?: string;
}

export async function createCustomer(params: CreateCustomerParams) {
  return asaasRequest('POST', '/customers', {
    name: params.name,
    cpfCnpj: params.cpfCnpj.replace(/\D/g, ''),
    email: params.email,
    mobilePhone: params.phone?.replace(/\D/g, '') || undefined,
    externalReference: params.externalReference,
    notificationDisabled: false,
  });
}

export async function getCustomer(customerId: string) {
  return asaasRequest('GET', `/customers/${customerId}`);
}

// --- Card Tokenization ---

export interface CardData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface CardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  phone: string;
}

export interface TokenizeResult {
  creditCardNumber: string; // last 4 digits
  creditCardBrand: string; // VISA, MASTERCARD, etc.
  creditCardToken: string; // token for future charges
}

export async function tokenizeCard(
  customerId: string,
  card: CardData,
  holderInfo: CardHolderInfo,
): Promise<TokenizeResult> {
  return asaasRequest('POST', '/creditCard/tokenize', {
    customer: customerId,
    creditCard: {
      holderName: card.holderName,
      number: card.number.replace(/\s/g, ''),
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      ccv: card.ccv,
    },
    creditCardHolderInfo: {
      name: holderInfo.name,
      email: holderInfo.email,
      cpfCnpj: holderInfo.cpfCnpj.replace(/\D/g, ''),
      postalCode: holderInfo.postalCode.replace(/\D/g, ''),
      addressNumber: holderInfo.addressNumber,
      phone: holderInfo.phone.replace(/\D/g, ''),
    },
  });
}

// --- Subscriptions ---

export interface CreateSubscriptionParams {
  customerId: string;
  creditCardToken: string;
  value: number;
  description: string;
  externalReference?: string;
  nextDueDate?: string; // YYYY-MM-DD, defaults to today
}

export async function createSubscription(params: CreateSubscriptionParams) {
  const nextDueDate = params.nextDueDate || new Date().toISOString().split('T')[0];
  return asaasRequest('POST', '/subscriptions', {
    customer: params.customerId,
    billingType: 'CREDIT_CARD',
    value: params.value,
    nextDueDate,
    cycle: 'MONTHLY',
    description: params.description,
    creditCardToken: params.creditCardToken,
    externalReference: params.externalReference,
  });
}

export async function getSubscription(subscriptionId: string) {
  return asaasRequest('GET', `/subscriptions/${subscriptionId}`);
}

export async function cancelSubscription(subscriptionId: string) {
  return asaasRequest('DELETE', `/subscriptions/${subscriptionId}`);
}

export async function getSubscriptionPayments(subscriptionId: string) {
  return asaasRequest('GET', `/subscriptions/${subscriptionId}/payments`);
}

// --- On-demand Charges ---

export async function chargeOnDemand(
  customerId: string,
  creditCardToken: string,
  value: number,
  description: string,
  externalReference?: string,
) {
  return asaasRequest('POST', '/payments', {
    customer: customerId,
    billingType: 'CREDIT_CARD',
    value,
    dueDate: new Date().toISOString().split('T')[0],
    description,
    creditCardToken,
    externalReference,
  });
}

// --- Plans ---

export const PLANS = {
  free: { name: 'Gratuito', value: 0, features: ['1 usuário', '100 movimentações/mês', 'Estoque básico'] },
  starter: { name: 'Starter', value: 89, features: ['5 usuários', 'Movimentações ilimitadas', 'CMV em tempo real', 'Fichas Técnicas', 'WhatsApp integrado'] },
  pro: { name: 'Pro', value: 149, features: ['Usuários ilimitados', 'Tudo do Starter', 'Multi-unidade', 'Checklists', 'Desperdícios', 'Etiquetas'] },
} as const;

export type PlanId = keyof typeof PLANS;
