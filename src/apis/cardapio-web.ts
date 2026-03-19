import 'dotenv/config';

const TOKEN = process.env.CARDAPIO_TOKEN!;
const BASE_URL = process.env.CARDAPIO_API_URL || 'https://integracao.cardapioweb.com';

async function apiGet(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'X-API-KEY': TOKEN,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed (${res.status}): ${text.substring(0, 500)}`);
  }

  return res.json();
}

// --- Loja (Merchant) ---

export function getMerchant() {
  return apiGet('/api/partner/v1/merchant');
}

// --- Catalogo ---

export function getCatalog() {
  return apiGet('/api/partner/v1/catalog');
}

// --- Cupons ---

export function getCoupons(page = 1) {
  return apiGet(`/api/partner/v1/merchant/coupons?page=${page}&per_page=20`);
}

// --- Pedidos ---

/** Pedidos ativos (em andamento) */
export function getActiveOrders() {
  return apiGet('/api/partner/v1/orders');
}

/**
 * Historico de pedidos (closed/canceled) por periodo.
 * Rate limit: 5 req/min. Formato data: ISO 8601 com timezone.
 */
export function getOrdersHistory(params: {
  start_date: string; // ISO 8601: 2026-03-16T00:00:00-03:00
  end_date: string;   // ISO 8601: 2026-03-16T23:59:59-03:00
  page?: number;
  per_page?: number;
  status?: ('closed' | 'canceled')[];
}) {
  const parts = [
    `start_date=${params.start_date}`,
    `end_date=${params.end_date}`,
  ];
  if (params.page) parts.push(`page=${params.page}`);
  if (params.per_page) parts.push(`per_page=${params.per_page}`);
  if (params.status) {
    for (const s of params.status) parts.push(`status[]=${s}`);
  }
  return apiGet(`/api/partner/v1/orders/history?${parts.join('&')}`);
}

/** Helper: historico de um dia especifico (YYYY-MM-DD) */
export function getOrdersForDay(date: string, page = 1, perPage = 100) {
  return getOrdersHistory({
    start_date: `${date}T00:00:00-03:00`,
    end_date: `${date}T23:59:59-03:00`,
    page,
    per_page: perPage,
  });
}

/** Detalhes completos de um pedido por ID */
export function getOrder(orderId: number | string) {
  return apiGet(`/api/partner/v1/orders/${orderId}`);
}

// --- Webhook ---

export function getWebhooks() {
  return apiGet('/api/partner/v1/webhooks');
}
