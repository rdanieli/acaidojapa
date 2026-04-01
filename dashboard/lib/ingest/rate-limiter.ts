/**
 * In-memory rate limiter per API key.
 * 100 requests per minute per key.
 */

const LIMIT = 100;
const WINDOW_MS = 60_000;

const buckets = new Map<number, { count: number; resetAt: number }>();

export function checkRateLimit(apiKeyId: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = buckets.get(apiKeyId);

  if (!bucket || now > bucket.resetAt) {
    const resetAt = now + WINDOW_MS;
    buckets.set(apiKeyId, { count: 1, resetAt });
    return { allowed: true, remaining: LIMIT - 1, resetAt };
  }

  if (bucket.count >= LIMIT) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count++;
  return { allowed: true, remaining: LIMIT - bucket.count, resetAt: bucket.resetAt };
}
