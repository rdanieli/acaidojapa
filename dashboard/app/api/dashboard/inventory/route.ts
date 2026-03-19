import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventoryEntries, inventoryItems } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending' | 'confirmed' | 'rejected' | null (all)

    const entries = status
      ? await db
          .select()
          .from(inventoryEntries)
          .where(eq(inventoryEntries.status, status))
          .orderBy(desc(inventoryEntries.createdAt))
          .limit(100)
      : await db
          .select()
          .from(inventoryEntries)
          .orderBy(desc(inventoryEntries.createdAt))
          .limit(100);

    // Fetch items for each entry
    const entriesWithItems = await Promise.all(
      entries.map(async (entry) => {
        const items = await db
          .select()
          .from(inventoryItems)
          .where(eq(inventoryItems.entryId, entry.id));

        return {
          ...entry,
          items,
        };
      })
    );

    return NextResponse.json({ entries: entriesWithItems });
  } catch (error) {
    console.error('[Inventory API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory entries' }, { status: 500 });
  }
}
