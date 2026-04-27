import { db } from '@/lib/db';
import { products, soldProducts, productNameAliases } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export type SizeTier = 'small' | 'medium' | 'large';

export interface ParsedOrderItem {
  soldProductId: number | null;
  sizeMl: number | null;
  sizeTier: SizeTier | null;
  complementProductIds: number[];
  unmatchedFragments: string[];
}

// In-memory caches (keyed by tenantId)
let aliasCache: Map<string, number> | null = null;
let aliasCacheTenantId: number | null = null;
let complementCache: Map<string, number> | null = null;
let complementCacheTenantId: number | null = null;
let soldProductCache: { id: number; name: string; sizeMl: number | null; category: string | null }[] | null = null;
let soldProductCacheTenantId: number | null = null;

export function clearParserCaches() {
  aliasCache = null;
  aliasCacheTenantId = null;
  complementCache = null;
  complementCacheTenantId = null;
  soldProductCache = null;
  soldProductCacheTenantId = null;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadAliasCache(tenantId: number): Promise<Map<string, number>> {
  if (aliasCache && aliasCacheTenantId === tenantId) return aliasCache;
  const aliases = await db.select().from(productNameAliases).where(eq(productNameAliases.tenantId, tenantId));
  aliasCache = new Map(aliases.map(a => [a.alias, a.soldProductId]));
  aliasCacheTenantId = tenantId;
  return aliasCache;
}

async function loadComplementCache(tenantId: number): Promise<Map<string, number>> {
  if (complementCache && complementCacheTenantId === tenantId) return complementCache;
  const complements = await db
    .select({ id: products.id, name: products.name, aliases: products.aliases })
    .from(products)
    .where(and(eq(products.category, 'complemento'), eq(products.tenantId, tenantId)));

  complementCache = new Map();
  for (const c of complements) {
    complementCache.set(normalize(c.name), c.id);
    if (c.aliases) {
      for (const alias of c.aliases.split(',')) {
        const trimmed = normalize(alias);
        if (trimmed) complementCache.set(trimmed, c.id);
      }
    }
  }
  complementCacheTenantId = tenantId;
  return complementCache;
}

async function loadSoldProductCache(tenantId: number) {
  if (soldProductCache && soldProductCacheTenantId === tenantId) return soldProductCache;
  const sp = await db
    .select({ id: soldProducts.id, name: soldProducts.name, sizeMl: soldProducts.sizeMl, category: soldProducts.category })
    .from(soldProducts)
    .where(and(eq(soldProducts.active, true), eq(soldProducts.tenantId, tenantId)));
  soldProductCache = sp;
  soldProductCacheTenantId = tenantId;
  return sp;
}

/** Extract size in ml from item name */
function extractSizeMl(text: string): number | null {
  const mlMatch = text.match(/(\d+)\s*ml/i);
  if (mlMatch) return parseInt(mlMatch[1], 10);

  const literMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:l(?:itro)?)\b/i);
  if (literMatch) return Math.round(parseFloat(literMatch[1].replace(',', '.')) * 1000);

  // Bare number matching a known cup size (e.g., "M MORANGO 300")
  const KNOWN_CUP_SIZES = [200, 300, 400, 500, 700];
  const bareMatch = text.match(/\b(\d{3})\b/);
  if (bareMatch) {
    const val = parseInt(bareMatch[1], 10);
    if (KNOWN_CUP_SIZES.includes(val)) return val;
  }

  return null;
}

/** Map ml to size tier */
export function mlToSizeTier(ml: number): SizeTier {
  if (ml <= 200) return 'small';
  if (ml <= 400) return 'medium';
  return 'large';
}

/**
 * Detect category from item name.
 */
function detectCategory(norm: string): string | null {
  if (norm.includes('milk') || norm.includes('milkshake') || norm.includes('milk shake')) return 'milkshake';
  if (/^m\s+/.test(norm)) return 'milkshake';
  if (/^kinder\b/.test(norm) && !norm.includes('ovo')) return 'milkshake';
  if (norm.includes('acai') || norm.includes('açai')) return 'acai';
  if (norm.includes('suco')) return 'suco';
  if (norm.includes('sorvete')) return 'sorvete';
  if (norm === 'kg') return 'sorvete';
  if (/^copo\s+\d+\s*ml\b/.test(norm)) return 'acai';
  return null;
}

const TOKEN_STOP_WORDS = new Set(['de', 'do', 'da', 'com', 'e', 'a', 'o', 'no', 'na', 'em', 'um', 'uma']);

function tokenize(s: string): string[] {
  return normalize(s).split(/\s+/).filter(t => t.length > 1 && !TOKEN_STOP_WORDS.has(t));
}

/** True when every meaningful token of `text` appears in `productName`. */
function allTokensPresent(text: string, productName: string): boolean {
  const textTokens = tokenize(text);
  if (textTokens.length === 0) return false;
  const prodTokens = new Set(tokenize(productName));
  return textTokens.every(t => prodTokens.has(t));
}

/** Find the best matching sold product */
async function matchSoldProduct(text: string, sizeMl: number | null, tenantId: number): Promise<number | null> {
  const sp = await loadSoldProductCache(tenantId);
  const category = detectCategory(text);
  const normText = normalize(text);

  // Path A: detected category — search within category, with size-based fallbacks
  if (category) {
    const candidates = sp.filter(p => p.category === category);
    if (candidates.length > 0) {
      const nameMatch = candidates.find(p => normalize(p.name).includes(normText));
      if (nameMatch) return nameMatch.id;

      const tokenMatched = candidates.find(p => allTokensPresent(normText, p.name));
      if (tokenMatched) return tokenMatched.id;

      if (sizeMl) {
        const exact = candidates.find(p => p.sizeMl === sizeMl);
        if (exact) return exact.id;

        const sorted = [...candidates]
          .filter(p => p.sizeMl != null)
          .sort((a, b) => Math.abs(a.sizeMl! - sizeMl) - Math.abs(b.sizeMl! - sizeMl));
        if (sorted.length > 0) return sorted[0].id;
      }
      return candidates[0].id;
    }
  }

  // Path B: no category (or empty category bucket) — broad search across all sold products.
  // Only matches when every meaningful token is present, so we don't false-match on partial overlap.
  const broadName = sp.find(p => normalize(p.name).includes(normText));
  if (broadName) return broadName.id;

  const broadToken = sp.find(p => allTokensPresent(normText, p.name));
  if (broadToken) return broadToken.id;

  return null;
}

/** Match a complement fragment against known complements */
async function matchComplement(fragment: string, tenantId: number): Promise<number | null> {
  const cache = await loadComplementCache(tenantId);
  const norm = normalize(fragment);

  if (cache.has(norm)) return cache.get(norm)!;

  for (const [name, id] of cache) {
    if (norm.includes(name) || name.includes(norm)) return id;
  }

  return null;
}

/**
 * Noise words/fragments to ignore when parsing complements.
 */
const NOISE_PATTERNS = [
  /^no\s+copo/,
  /^copo$/,
  /^-+$/,
  /^do\s+/,
  /^da\s+/,
  /^de\s+/,
  /^em\s+/,
  /^um\s+/,
  /^uma\s+/,
];

function isNoise(fragment: string): boolean {
  const norm = fragment.trim();
  if (norm.length <= 2) return true;
  return NOISE_PATTERNS.some(p => p.test(norm));
}

/** Split complement text into individual fragments */
function splitComplements(text: string): string[] {
  let cleaned = text
    .replace(/\b(?:acai|açai|acaí|açaí|suco|sorvete|milk\s*shake|copo)\b/gi, '')
    .replace(/\d+\s*ml/gi, '')
    .replace(/\d+(?:[.,]\d+)?\s*l(?:itro)?\b/gi, '')
    .replace(/\b(200|300|400|500|700)\b/g, '')
    .replace(/[-–—]+/g, ' ')
    .trim();

  const parts = cleaned
    .split(/\s*(?:\+|,|c\/|com\s+|\s+e\s+|\/)\s*/i)
    .map(s => s.trim())
    .filter(s => !isNoise(s));

  return parts;
}

/**
 * Parse an order item name into its components.
 */
export async function parseOrderItem(itemName: string, tenantId?: number): Promise<ParsedOrderItem> {
  // Default tenantId to 1 for backward compatibility
  const tid = tenantId ?? 1;
  const norm = normalize(itemName);

  // 1. Check alias cache for fast soldProduct resolution
  const aliases = await loadAliasCache(tid);
  const aliasMatch = aliases.get(norm) ?? null;

  // 2. Extract size
  const sizeMl = extractSizeMl(norm);
  const sizeTier = sizeMl ? mlToSizeTier(sizeMl) : null;

  // 3. Match base product (use alias if available, otherwise full match)
  const soldProductId = aliasMatch ?? await matchSoldProduct(norm, sizeMl, tid);

  // 4. Extract and match complements
  const fragments = splitComplements(norm);
  const complementProductIds: number[] = [];
  const unmatchedFragments: string[] = [];

  for (const frag of fragments) {
    const compId = await matchComplement(frag, tid);
    if (compId) {
      if (!complementProductIds.includes(compId)) {
        complementProductIds.push(compId);
      }
    } else if (frag.length > 2) {
      unmatchedFragments.push(frag);
    }
  }

  // 5. Auto-save alias if we got a good match
  if (soldProductId && unmatchedFragments.length === 0) {
    try {
      await db.insert(productNameAliases).values({
        tenantId: tid,
        alias: norm,
        soldProductId,
        source: 'auto',
      }).onConflictDoNothing();
      aliasCache = null;
      aliasCacheTenantId = null;
    } catch {
      // Ignore
    }
  }

  return { soldProductId, sizeMl, sizeTier, complementProductIds, unmatchedFragments };
}
