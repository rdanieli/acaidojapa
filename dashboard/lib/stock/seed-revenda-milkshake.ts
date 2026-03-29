import { db } from '@/lib/db';
import { products, soldProducts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const REVENDA_PRODUCTS: { name: string; aliases: string; costPerUnit: string }[] = [
  { name: 'Água sem Gás 500ml', aliases: 'agua,agua sem gas,agua sem gas 500ml', costPerUnit: '1.10' },
  { name: 'Água com Gás 500ml', aliases: 'agua com gas,agua com gas 500ml', costPerUnit: '1.10' },
  { name: 'Coca Cola Lata', aliases: 'refrigerante,coca cola,coca cola lata', costPerUnit: '3.00' },
  { name: 'Heineken Long Neck', aliases: 'heineken,heinecken,cerveja heineken,cerveja heineken long neck', costPerUnit: '6.29' },
  { name: 'Corona Long Neck', aliases: 'corona,cerveja corona,cerveja corona long neck', costPerUnit: '6.40' },
  { name: 'Monster', aliases: 'monster', costPerUnit: '5.99' },
  { name: 'Kinder Ovo', aliases: 'kinder ovo', costPerUnit: '7.00' },
  { name: 'Lays', aliases: 'lays', costPerUnit: '7.24' },
  { name: 'Doritos 75g', aliases: 'doritos,doritos 75g', costPerUnit: '7.25' },
  { name: 'Pingo Picanha', aliases: 'pingo picanha', costPerUnit: '4.34' },
  { name: 'Pingo Bacon', aliases: 'pingo bacon,pingo  bacon', costPerUnit: '4.34' },
  { name: 'Kapo', aliases: 'kapo,kapo maca,kapo maça', costPerUnit: '2.50' },
  { name: 'Cheetos Onda 105g', aliases: 'cheetos,cheetos onda,cheetos onda 105g,cheetos - lua parmesao,cheetos lua parmesao', costPerUnit: '7.25' },
  { name: 'Ruffles', aliases: 'ruffles', costPerUnit: '7.12' },
  { name: 'Toddynho', aliases: 'toddynho,todynho', costPerUnit: '2.84' },
  { name: 'Brahma', aliases: 'brahma,cerveja brahma', costPerUnit: '5.20' },
  { name: 'Fandangos', aliases: 'fandangos', costPerUnit: '7.25' },
];

const MILKSHAKE_SOLD_PRODUCTS: { name: string; sizeMl: number | null; costPrice: string }[] = [
  { name: 'Milkshake Morango 300ml', sizeMl: 300, costPrice: '8.85' },
  { name: 'Milkshake Morango 400ml', sizeMl: 400, costPrice: '11.08' },
  { name: 'Milkshake Kinder 300ml', sizeMl: 300, costPrice: '8.35' },
  { name: 'Milkshake Kinder 400ml', sizeMl: 400, costPrice: '8.35' },
  { name: 'Milkshake Kinder Bueno', sizeMl: null, costPrice: '8.35' },
];

const SORVETE_KG_SOLD_PRODUCT = { name: 'Sorvete KG', sizeMl: null, costPrice: null };

export async function seedRevendaAndMilkshake(tenantId: number) {
  let revendaCreated = 0;
  let revendaSkipped = 0;
  let milkshakeCreated = 0;
  let milkshakeSkipped = 0;

  // Seed revenda products
  for (const p of REVENDA_PRODUCTS) {
    const [existing] = await db.select().from(products).where(and(eq(products.name, p.name), eq(products.tenantId, tenantId))).limit(1);
    if (existing) {
      // Update aliases and cost if product exists
      await db.update(products).set({
        aliases: p.aliases,
        costPerUnit: p.costPerUnit,
        category: 'revenda',
        defaultUnit: 'un',
      }).where(and(eq(products.id, existing.id), eq(products.tenantId, tenantId)));
      revendaSkipped++;
    } else {
      await db.insert(products).values({
        tenantId,
        name: p.name,
        aliases: p.aliases,
        costPerUnit: p.costPerUnit,
        category: 'revenda',
        defaultUnit: 'un',
      });
      revendaCreated++;
    }
  }

  // Seed milkshake sold products
  for (const m of MILKSHAKE_SOLD_PRODUCTS) {
    const [existing] = await db.select().from(soldProducts).where(and(eq(soldProducts.name, m.name), eq(soldProducts.tenantId, tenantId))).limit(1);
    if (existing) {
      await db.update(soldProducts).set({
        sizeMl: m.sizeMl,
        costPrice: m.costPrice,
        category: 'milkshake',
      }).where(and(eq(soldProducts.id, existing.id), eq(soldProducts.tenantId, tenantId)));
      milkshakeSkipped++;
    } else {
      await db.insert(soldProducts).values({
        tenantId,
        name: m.name,
        sizeMl: m.sizeMl,
        costPrice: m.costPrice,
        category: 'milkshake',
      });
      milkshakeCreated++;
    }
  }

  // Seed Sorvete KG sold product
  const [existingSorveteKg] = await db.select().from(soldProducts).where(and(eq(soldProducts.name, SORVETE_KG_SOLD_PRODUCT.name), eq(soldProducts.tenantId, tenantId))).limit(1);
  if (!existingSorveteKg) {
    await db.insert(soldProducts).values({
      tenantId,
      name: SORVETE_KG_SOLD_PRODUCT.name,
      sizeMl: SORVETE_KG_SOLD_PRODUCT.sizeMl,
      costPrice: SORVETE_KG_SOLD_PRODUCT.costPrice,
      category: 'sorvete',
    });
  }

  return {
    revenda: { created: revendaCreated, updated: revendaSkipped },
    milkshake: { created: milkshakeCreated, updated: milkshakeSkipped },
  };
}
