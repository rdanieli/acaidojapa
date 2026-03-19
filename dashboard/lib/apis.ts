import 'server-only';
import { getCached, setCache, TTL_PAST, TTL_TODAY, TTL_STOCK } from './cache';
import { cardapioLimiter } from './rate-limiter';
import { formatDateISO } from './format';

// ─── PDV Legal ───

let pdvToken: { access_token: string; expires_at: number } | null = null;

async function getPdvToken(): Promise<string> {
  if (pdvToken && Date.now() < pdvToken.expires_at) {
    return pdvToken.access_token;
  }

  const body = new URLSearchParams({
    username: process.env.PDV_USERNAME!,
    password: process.env.PDV_PASSWORD!,
    grant_type: 'password',
    client_id: process.env.PDV_CLIENT_ID!,
    client_secret: process.env.PDV_CLIENT_SECRET!,
  });

  const res = await fetch(`${process.env.PDV_API_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`PDV token failed (${res.status})`);
  const data = await res.json();

  pdvToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };

  return pdvToken.access_token;
}

async function pdvGet(path: string) {
  const token = await getPdvToken();
  const res = await fetch(`${process.env.PDV_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`PDV GET ${path} failed (${res.status})`);
  return res.json();
}

const filial = () => process.env.PDV_COD_FILIAL!;

export async function pdvGetCupons(dataInicial: string, dataFinal: string) {
  return pdvGet(`/cupom/get/${dataInicial}/${dataFinal}/${filial()}`);
}

export async function pdvGetEstoque() {
  return pdvGet(`/estoque/get/${filial()}`);
}

// ─── Cardapio Web ───

// Global sequential queue for ALL CW requests — prevents 429 by serializing
let cwQueue: Promise<void> = Promise.resolve();

function enqueueCw<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    cwQueue = cwQueue.then(() => fn().then(resolve, reject));
  });
}

async function cwGet(path: string, retries = 10): Promise<any> {
  return enqueueCw(async () => {
    const base = process.env.CARDAPIO_API_URL || 'https://integracao.cardapioweb.com';

    for (let attempt = 0; attempt <= retries; attempt++) {
      const res = await fetch(`${base}${path}`, {
        headers: {
          'X-API-KEY': process.env.CARDAPIO_TOKEN!,
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
export async function cwGetOrdersHistory(start: string, end: string, page = 1, perPage = 100) {
  return cwGet(
    `/api/partner/v1/orders/history?start_date=${start}T00:00:00-03:00&end_date=${end}T23:59:59-03:00&page=${page}&per_page=${perPage}`,
  );
}

export async function cwGetOrder(orderId: number | string) {
  return cwGet(`/api/partner/v1/orders/${orderId}`);
}

// ─── Cached Wrappers ───

function getTTL(dateStr: string): number {
  const today = formatDateISO(new Date());
  return dateStr === today ? TTL_TODAY : TTL_PAST;
}

/** Get PDV cupons for a date range, with caching. Max 10 days per call. */
export async function getCuponsForRange(start: string, end: string) {
  const key = `pdv:cupons:${start}:${end}`;
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

    const cupons = await pdvGetCupons(formatDateISO(chunkStart), formatDateISO(chunkEnd));
    if (Array.isArray(cupons)) allCupons.push(...cupons);

    chunkStart.setDate(chunkEnd.getDate() + 1);
  }

  setCache(key, allCupons, getTTL(end));
  return allCupons;
}

/** Get CW orders for a single day. Fetches history then details. */
export async function getOnlineOrdersForRange(start: string, end: string) {
  // Single day mode — use start date
  const key = `cw:orders:${start}`;
  const cached = getCached<any[]>(key);
  if (cached) return cached;

  const result = await cwGetOrdersHistory(start, start);
  const orders = result.orders || [];

  const allOrders: any[] = [];
  for (const o of orders) {
    const detail = await cwGetOrder(o.id);
    allOrders.push(detail);
  }

  setCache(key, allOrders, getTTL(start));
  return allOrders;
}

/** Get full order detail (items, payments) for a single order */
export async function getOnlineOrderDetail(orderId: number | string) {
  const key = `cw:order:${orderId}`;
  const cached = getCached<any>(key);
  if (cached) return cached;

  const detail = await cwGetOrder(orderId);
  setCache(key, detail, TTL_PAST);
  return detail;
}

/** Get stock data with caching */
export async function getStock() {
  const key = 'pdv:estoque';
  const cached = getCached<any[]>(key);
  if (cached) return cached;

  const data = await pdvGetEstoque();
  const items = Array.isArray(data) ? data : [];
  setCache(key, items, TTL_STOCK);
  return items;
}
