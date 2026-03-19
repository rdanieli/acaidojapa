import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const items = await db
      .select()
      .from(products)
      .where(eq(products.active, true));
    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('Stock error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
