import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiKeys, ingestEvents } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkRateLimit } from '@/lib/ingest/rate-limiter';
import { processEvent, VALID_EVENTS } from '@/lib/ingest/process-event';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth via API key
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing Authorization header. Use: Bearer tng_k_...' }, { status: 401 });
    }
    const key = authHeader.slice(7);

    const [apiKey] = await db.select().from(apiKeys)
      .where(and(eq(apiKeys.key, key), eq(apiKeys.active, true)))
      .limit(1);

    if (!apiKey) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 });
    }

    // 2. Rate limit
    const rl = checkRateLimit(apiKey.id);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 100 requests/minute.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)), 'X-RateLimit-Remaining': '0' } }
      );
    }

    // 3. Parse and validate
    const body = await request.json();
    const { event, data } = body;

    if (!event || !data) {
      return NextResponse.json({ error: 'Missing required fields: event, data' }, { status: 400 });
    }

    if (!VALID_EVENTS.includes(event)) {
      return NextResponse.json({ error: `Invalid event. Valid events: ${VALID_EVENTS.join(', ')}` }, { status: 400 });
    }

    // 4. Store event
    const [ingestEvent] = await db.insert(ingestEvents).values({
      tenantId: apiKey.tenantId,
      apiKeyId: apiKey.id,
      event,
      payload: data,
      source: 'api',
    }).returning();

    // 5. Update last used
    db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, apiKey.id)).catch(() => {});

    // 6. Try to process immediately
    let processed = false;
    try {
      await processEvent(ingestEvent.id);
      processed = true;
    } catch (err: any) {
      console.error(`[Ingest] Event ${ingestEvent.id} failed:`, err.message);
      // Event stays as 'failed' in DB — can be retried later
    }

    return NextResponse.json(
      { id: ingestEvent.id, status: processed ? 'completed' : 'failed', event },
      { status: 202, headers: { 'X-RateLimit-Remaining': String(rl.remaining) } }
    );
  } catch (error: any) {
    console.error('[Ingest API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
