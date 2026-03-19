import { db } from '@/lib/db';
import { products, soldProducts, productNameAliases } from '@/lib/db/schema';
import { eq, ilike } from 'drizzle-orm';

export type SizeTier = 'small' | 'medium' | 'large';

export interface ParsedOrderItem {
  soldProductId: number | null;
  sizeMl: number | null;
  sizeTier: SizeTier | null;
  complementProductIds: number[];
  unmatchedFragments: string[];
}

// In-memory caches (per process lifetime)
let aliasCache: Map<string, number> | null = null;
let complementCache: Map<string, number> | null = null;
let soldProductCache: { id: number; name: string; sizeMl: number | null; category: string | null }[] | null = null;

export function clearParserCaches() {
  aliasCache = null;
  complementCache = null;
  soldProductCache = null;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadAliasCache(): Promise<Map<string, number>> {
  if (aliasCache) return aliasCache;
  const aliases = await db.select().from(productNameAliases);
  aliasCache = new Map(aliases.map(a => [a.alias, a.soldProductId]));
  return aliasCache;
}

async function loadComplementCache(): Promise<Map<string, number>> {
  if (complementCache) return complementCache;
  const complements = await db
    .select({ id: products.id, name: products.name, aliases: products.aliases })
    .from(products)
    .where(eq(products.category, 'complemento'));

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
  return complementCache;
}

async function loadSoldProductCache() {
  if (soldProductCache) return soldProductCache;
  const sp = await db
    .select({ id: soldProducts.id, name: soldProducts.name, sizeMl: soldProducts.sizeMl, category: soldProducts.category })
    .from(soldProducts)
    .where(eq(soldProducts.active, true));
  soldProductCache = sp;
  return sp;
}

/** Extract size in ml from item name */
function extractSizeMl(text: string): number | null {
  // Match patterns like "200ml", "300 ml", "1l", "1 litro"
  const mlMatch = text.match(/(\d+)\s*ml/i);
  if (mlMatch) return parseInt(mlMatch[1], 10);

  const literMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:l(?:itro)?)\b/i);
  if (literMatch) return Math.round(parseFloat(literMatch[1].replace(',', '.')) * 1000);

  return null;
}

/** Map ml to size tier */
export function mlToSizeTier(ml: number): SizeTier {
  if (ml <= 200) return 'small';
  if (ml <= 400) return 'medium';
  return 'large';
}

/** Find the best matching sold product */
async function matchSoldProduct(text: string, sizeMl: number | null): Promise<number | null> {
  const sp = await loadSoldProductCache();
  const norm = normalize(text);

  // Determine category
  let category: string | null = null;
  if (norm.includes('acai') || norm.includes('açaí')) category = 'acai';
  else if (norm.includes('suco')) category = 'suco';
  else if (norm.includes('sorvete')) category = 'sorvete';

  if (!category) return null;

  // Filter by category, then best match by size
  const candidates = sp.filter(p => p.category === category);
  if (candidates.length === 0) return null;

  if (sizeMl) {
    // Exact size match
    const exact = candidates.find(p => p.sizeMl === sizeMl);
    if (exact) return exact.id;

    // Closest size
    const sorted = [...candidates]
      .filter(p => p.sizeMl != null)
      .sort((a, b) => Math.abs(a.sizeMl! - sizeMl) - Math.abs(b.sizeMl! - sizeMl));
    if (sorted.length > 0) return sorted[0].id;
  }

  // Return first match
  return candidates[0].id;
}

/** Match a complement fragment against known complements */
async function matchComplement(fragment: string): Promise<number | null> {
  const cache = await loadComplementCache();
  const norm = normalize(fragment);

  // Exact match
  if (cache.has(norm)) return cache.get(norm)!;

  // Partial match: check if any complement name is contained in the fragment or vice versa
  for (const [name, id] of cache) {
    if (norm.includes(name) || name.includes(norm)) return id;
  }

  return null;
}

/** Split complement text into individual fragments */
function splitComplements(text: string): string[] {
  // Remove the base product part (acai XXml, etc.)
  let cleaned = text
    .replace(/\b(?:acai|açaí|suco|sorvete)\b/gi, '')
    .replace(/\d+\s*ml/gi, '')
    .replace(/\d+(?:[.,]\d+)?\s*l(?:itro)?\b/gi, '')
    .trim();

  // Split on common separators: +, comma, "c/", "com", " e ", " / "
  const parts = cleaned
    .split(/\s*(?:\+|,|c\/|com\s+|\s+e\s+|\/)\s*/i)
    .map(s => s.trim())
    .filter(s => s.length > 1);

  return parts;
}

/**
 * Parse an order item name into its components.
 * Returns the matched sold product, size tier, complements, and unmatched fragments.
 */
export async function parseOrderItem(itemName: string): Promise<ParsedOrderItem> {
  const norm = normalize(itemName);

  // 1. Check alias cache first
  const aliases = await loadAliasCache();
  const aliasMatch = aliases.get(norm);
  if (aliasMatch) {
    // For aliased items, we still need to extract size
    const sizeMl = extractSizeMl(norm);
    const sizeTier = sizeMl ? mlToSizeTier(sizeMl) : null;
    return {
      soldProductId: aliasMatch,
      sizeMl,
      sizeTier,
      complementProductIds: [],
      unmatchedFragments: [],
    };
  }

  // 2. Extract size
  const sizeMl = extractSizeMl(norm);
  const sizeTier = sizeMl ? mlToSizeTier(sizeMl) : null;

  // 3. Match base product
  const soldProductId = await matchSoldProduct(norm, sizeMl);

  // 4. Extract and match complements
  const fragments = splitComplements(norm);
  const complementProductIds: number[] = [];
  const unmatchedFragments: string[] = [];

  for (const frag of fragments) {
    const compId = await matchComplement(frag);
    if (compId) {
      if (!complementProductIds.includes(compId)) {
        complementProductIds.push(compId);
      }
    } else if (frag.length > 2) {
      unmatchedFragments.push(frag);
    }
  }

  // 5. Auto-save alias if we got a good match (base product + no unmatched)
  if (soldProductId && unmatchedFragments.length === 0) {
    try {
      await db.insert(productNameAliases).values({
        alias: norm,
        soldProductId,
        source: 'auto',
      }).onConflictDoNothing();
      // Invalidate cache so next lookup uses it
      aliasCache = null;
    } catch {
      // Ignore duplicate constraint
    }
  }

  return { soldProductId, sizeMl, sizeTier, complementProductIds, unmatchedFragments };
}
