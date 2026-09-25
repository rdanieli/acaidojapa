import 'server-only';
import { getCached, setCache, TTL_PAST, TTL_TODAY, TTL_STOCK } from './cache';
import { formatDateISO } from './format';

export interface PdvCredentials {
  apiUrl: string;
  username: string;
  password: string;
  clientId: string;
  clientSecret: string;
  codFilial: string;
}

export interface CardapioCredentials {
  apiUrl: string;
  token: string;
}

export interface IntegrationCredentials {
  tenantId: number;
  pdv: PdvCredentials | null;
  cardapio: CardapioCredentials | null;
}

function requirePdv(creds: IntegrationCredentials): PdvCredentials {
  if (!creds.pdv) {
    throw new Error('Integração com o PDV não configurada para este cliente.');
  }
  return creds.pdv;
}

function requireCardapio(creds: IntegrationCredentials): CardapioCredentials {
  if (!creds.cardapio) {
    throw new Error('Integração com o Cardápio Web não configurada para este cliente.');
  }
  return creds.cardapio;
}

// ─── PDV Legal ───

const pdvTokens = new Map<number, { access_token: string; expires_at: number }>();

async function getPdvToken(creds: IntegrationCredentials): Promise<string> {
  const pdv = requirePdv(creds);
  const cached = pdvTokens.get(creds.tenantId);
  if (cached && Date.now() < cached.expires_at) {
    return cached.access_token;
  }

  const body = new URLSearchParams({
    username: pdv.username,
    password: pdv.password,
    grant_type: 'password',
    client_id: pdv.clientId,
    client_secret: pdv.clientSecret,
  });

  const res = await fetch(`${pdv.apiUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`PDV token failed (${res.status})`);
  const data = await res.json();

  const token = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };
  pdvTokens.set(creds.tenantId, token);

  return token.access_token;
}

async function pdvGet(creds: IntegrationCredentials, path: string) {
  const pdv = requirePdv(creds);
  const token = await getPdvToken(creds);
  const res = await fetch(`${pdv.apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`PDV GET ${path} failed (${res.status})`);
  return res.json();
}

export async function pdvGetCupons(creds: IntegrationCredentials, dataInicial: string, dataFinal: string) {
  return pdvGet(creds, `/cupom/get/${dataInicial}/${dataFinal}/${requirePdv(creds).codFilial}`);
}

export async function pdvGetEstoque(creds: IntegrationCredentials) {
  return pdvGet(creds, `/estoque/get/${requirePdv(creds).codFilial}`);
}

// ─── Cardapio Web ───

// Global sequential queue for ALL CW requests — prevents 429 by serializing
let cwQueue: Promise<void> = Promise.resolve();

function enqueueCw<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    cwQueue = cwQueue.then(() => fn().then(resolve, reject));
  });
}

async function cwGet(creds: IntegrationCredentials, path: string, retries = 10): Promise<any> {
  const cardapio = requireCardapio(creds);
  return enqueueCw(async () => {
    const base = cardapio.apiUrl;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const res = await fetch(`${base}${path}`, {
        headers: {
          'X-API-KEY': cardapio.token,
          Accept: 'application/json',
        },
      });

      if (res.status === 429 && attempt < retries) {
        const waitMs = 13_000; // wait just over 12s (1 token refill)
        console.log(`CW 429, waiting ${waitMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      if (!res.ok) throw new Error(`CW GET ${path} failed (${res.status})`);
      return res.json();
    }
  });
}

/** Fetch history for a full date range (single API call, paginated) */
export async function cwGetOrdersHistory(creds: IntegrationCredentials, start: string, end: string, page = 1, perPage = 100) {
  return cwGet(
    creds,
    `/api/partner/v1/orders/history?start_date=${start}T00:00:00-03:00&end_date=${end}T23:59:59-03:00&page=${page}&per_page=${perPage}`,
  );
}

export async function cwGetOrder(creds: IntegrationCredentials, orderId: number | string) {
  return cwGet(creds, `/api/partner/v1/orders/${orderId}`);
}

// ─── Cached Wrappers ───

function getTTL(dateStr: string): number {
  const today = formatDateISO(new Date());
  return dateStr === today ? TTL_TODAY : TTL_PAST;
}

/** Get PDV cupons for a date range, with caching. Max 10 days per call. */
export async function getCuponsForRange(creds: IntegrationCredentials, start: string, end: string) {
  const key = `t${creds.tenantId}:pdv:cupons:${start}:${end}`;
  const cached = getCached<any[]>(key);
  if (cached) return cached;

  // Split into 10-day chunks
  const startDate = new Date(start + 'T12:00:00');
  const endDate = new Date(end + 'T12:00:00');
  const allCupons: any[] = [];

  let chunkStart = new Date(startDate);
  while (chunkStart <= endDate) {
    const chunkEnd = new Date(chunkStart);
    chunkEnd.setDate(chunkEnd.getDate() + 9);
    if (chunkEnd > endDate) chunkEnd.setTime(endDate.getTime());

    const cupons = await pdvGetCupons(creds, formatDateISO(chunkStart), formatDateISO(chunkEnd));
    if (Array.isArray(cupons)) allCupons.push(...cupons);

    chunkStart.setDate(chunkEnd.getDate() + 1);
  }

  setCache(key, allCupons, getTTL(end));
  return allCupons;
}

/** Get CW orders for a single day. Fetches history then details. */
export async function getOnlineOrdersForRange(creds: IntegrationCredentials, start: string, end: string) {
  // Single day mode — use start date
  const key = `t${creds.tenantId}:cw:orders:${start}`;
  const cached = getCached<any[]>(key);
  if (cached) return cached;

  const result = await cwGetOrdersHistory(creds, start, start);
  const orders = result.orders || [];

  const allOrders: any[] = [];
  for (const o of orders) {
    const detail = await cwGetOrder(creds, o.id);
    allOrders.push(detail);
  }

  setCache(key, allOrders, getTTL(start));
  return allOrders;
}

/** Get full order detail (items, payments) for a single order */
export async function getOnlineOrderDetail(creds: IntegrationCredentials, orderId: number | string) {
  const key = `t${creds.tenantId}:cw:order:${orderId}`;
  const cached = getCached<any>(key);
  if (cached) return cached;

  const detail = await cwGetOrder(creds, orderId);
  setCache(key, detail, TTL_PAST);
  return detail;
}

/** Get stock data with caching */
export async function getStock(creds: IntegrationCredentials) {
  const key = `t${creds.tenantId}:pdv:estoque`;
  const cached = getCached<any[]>(key);
  if (cached) return cached;

  const data = await pdvGetEstoque(creds);
  const items = Array.isArray(data) ? data : [];
  setCache(key, items, TTL_STOCK);
  return items;
}
