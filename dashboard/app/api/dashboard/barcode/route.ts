import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getTenantScope } from '@/lib/db/tenant';

// Generate a unique barcode: tenant prefix + product id, padded to 12 digits + check digit
function generateEAN13(tenantId: number, productId: number): string {
  const raw = String(tenantId).padStart(3, '0') + String(productId).padStart(9, '0');
  // Calculate EAN-13 check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(raw[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return raw + check;
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { productId } = await request.json();
    if (!productId) return NextResponse.json({ error: 'productId obrigatório' }, { status: 400 });

    const barcode = generateEAN13(tenantId, productId);

    await db.update(products).set({ barcode })
      .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)));

    return NextResponse.json({ barcode });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Build candidate barcodes to handle scanner quirks:
// - UPC-A vs EAN-13: scanners often strip leading "0" from EAN-13, returning 12 digits
// - Some scanners pad to 13 digits; others don't
function candidateBarcodes(raw: string): string[] {
  const code = raw.trim();
  const candidates = new Set<string>([code]);
  if (/^\d+$/.test(code)) {
    // If 12 digits, try with leading "0" (EAN-13 with zero prefix)
    if (code.length === 12) candidates.add('0' + code);
    // If 13 digits starting with "0", try without leading zero (UPC-A form)
    if (code.length === 13 && code.startsWith('0')) candidates.add(code.slice(1));
    // If 11 digits, try with two leading zeros
    if (code.length === 11) candidates.add('00' + code);
  }
  return Array.from(candidates);
}

// GET: lookup product by barcode
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get('barcode');
    if (!barcode) return NextResponse.json({ error: 'barcode obrigatório' }, { status: 400 });

    const candidates = candidateBarcodes(barcode);
    const [product] = await db.select().from(products)
      .where(and(inArray(products.barcode, candidates), eq(products.tenantId, tenantId)))
      .limit(1);

    if (!product) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });

    return NextResponse.json({ product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
