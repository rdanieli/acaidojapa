interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/** TTL for past days (data won't change) */
export const TTL_PAST = 60 * 60 * 1000; // 1 hour

/** TTL for today (near real-time) */
export const TTL_TODAY = 2 * 60 * 1000; // 2 minutes

/** TTL for stock data */
export const TTL_STOCK = 5 * 60 * 1000; // 5 minutes
