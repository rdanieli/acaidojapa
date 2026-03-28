import 'server-only';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// --- PDV modifier mapping (fetched from Tablet Cloud API) ---

let pdvModifierCache: Map<number, string> | null = null;

async function loadPdvModifiers(): Promise<Map<number, string>> {
  if (pdvModifierCache) return pdvModifierCache;

  const apiUrl = process.env.PDV_API_URL;
  const username = process.env.PDV_USERNAME;
  const password = process.env.PDV_PASSWORD;
  const clientId = process.env.PDV_CLIENT_ID;
  const clientSecret = process.env.PDV_CLIENT_SECRET;
  const codFilial = process.env.PDV_COD_FILIAL;

  if (!apiUrl || !username || !password || !clientId || !clientSecret || !codFilial) {
    console.warn('[extract-complements] PDV env vars missing');
    pdvModifierCache = new Map();
    return pdvModifierCache;
  }

  const tokenRes = await fetch(`${apiUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username, password, grant_type: 'password',
      client_id: clientId, client_secret: clientSecret,
    }).toString(),
  });

  if (!tokenRes.ok) {
    console.error('[extract-complements] PDV token failed:', tokenRes.status);
    pdvModifierCache = new Map();
    return pdvModifierCache;
  }

  const { access_token } = await tokenRes.json();
  const modRes = await fetch(`${apiUrl}/modificador/get/${codFilial}/2020-01-01`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!modRes.ok) {
    console.error('[extract-complements] PDV modifiers failed:', modRes.status);
    pdvModifierCache = new Map();
    return pdvModifierCache;
  }

  const modifiers: any[] = await modRes.json();
  pdvModifierCache = new Map();
  for (const m of modifiers) {
    pdvModifierCache.set(m.codigo, m.descricaoModificador);
  }
  console.log(`[extract-complements] Loaded ${pdvModifierCache.size} PDV modifiers`);
  return pdvModifierCache;
}

export function clearComplementCaches() {
  pdvModifierCache = null;
  complementNameCache = null;
  complementNameCacheTenantId = null;
}

// --- Complement name -> product ID mapping ---

let complementNameCache: Map<string, number> | null = null;
let complementNameCacheTenantId: number | null = null;

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

async function loadComplementNameMap(tenantId: number): Promise<Map<string, number>> {
  if (complementNameCache && complementNameCacheTenantId === tenantId) return complementNameCache;

  const complements = await db
    .select({ id: products.id, name: products.name, aliases: products.aliases })
    .from(products)
    .where(and(eq(products.category, 'complemento'), eq(products.tenantId, tenantId)));

  complementNameCache = new Map();
  for (const c of complements) {
    complementNameCache.set(normalize(c.name), c.id);
    if (c.aliases) {
      for (const alias of c.aliases.split(',')) {
        const trimmed = normalize(alias);
        if (trimmed) complementNameCache.set(trimmed, c.id);
      }
    }
  }
  complementNameCacheTenantId = tenantId;
  return complementNameCache;
}

function matchName(name: string, cache: Map<string, number>): number | null {
  const norm = normalize(name);
  if (cache.has(norm)) return cache.get(norm)!;
  for (const [key, id] of cache) {
    if (norm.includes(key) || key.includes(norm)) return id;
  }
  return null;
}

// --- Complement groups to include (Cardapio Web) ---
const COMPLEMENT_GROUPS = new Set(['escolha os complementos', 'adicionais']);

/**
 * Extract complement product IDs for a specific item in an order.
 *
 * @param rawData - The order's raw_data JSON
 * @param channel - 'pdv' or 'online'
 * @param itemIndex - Index of the item in the normalized items array
 * @param tenantId - Tenant ID for scoping product lookups
 */
export async function getComplementsForItem(
  rawData: any,
  channel: 'pdv' | 'online',
  itemIndex: number,
  tenantId?: number,
): Promise<{ complementProductIds: number[]; unmatchedNames: string[] }> {
  if (!rawData) return { complementProductIds: [], unmatchedNames: [] };

  const tid = tenantId ?? 1;
  const nameMap = await loadComplementNameMap(tid);
  const complementNames: string[] = [];

  if (channel === 'online') {
    // Cardapio Web: items[itemIndex].options[]
    const items = rawData.items || [];
    const item = items[itemIndex];
    if (item?.options) {
      for (const opt of item.options) {
        const groupName = normalize(opt.option_group_name || '');
        if (COMPLEMENT_GROUPS.has(groupName)) {
          complementNames.push(opt.name);
        }
      }
    }
  } else if (channel === 'pdv') {
    // PDV: find the codproduto for this item, then match modifiers
    const rawItems = (rawData.itens || []).filter((i: any) => !i.iscancelado);
    const rawItem = rawItems[itemIndex];
    if (!rawItem) return { complementProductIds: [], unmatchedNames: [] };

    const codProduto = rawItem.codproduto;
    const modifiers = rawData.modificadores || [];
    const pdvMap = await loadPdvModifiers();

    for (const mod of modifiers) {
      if (mod.codProduto !== codProduto) continue;
      const name = pdvMap.get(mod.codModificador);
      if (name) complementNames.push(name);
    }
  }

  // Resolve names to product IDs
  const complementProductIds: number[] = [];
  const unmatchedNames: string[] = [];
  for (const name of complementNames) {
    const productId = matchName(name, nameMap);
    if (productId) {
      if (!complementProductIds.includes(productId)) complementProductIds.push(productId);
    } else {
      unmatchedNames.push(name);
    }
  }

  return { complementProductIds, unmatchedNames };
}
