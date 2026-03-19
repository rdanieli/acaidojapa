import { db } from '@/lib/db';
import { products, complementGramages } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Complement gramages by size tier from fichas técnicas.
 * [name, small (200ml), medium (300/400ml), large (500/700ml)]
 */
const COMPLEMENT_DATA: [string, number, number, number][] = [
  ['Abacaxi',              20,  50, 100],
  ['Amendoim',             13,  16,  32],
  ['Aveia',                13,  20,  28],
  ['Banana',               20,  80, 100],
  ['Bis branco',            7,  15,  22],
  ['Bis preto',             7,  15,  22],
  ['Cobertura Fini banana', 7,  15,  30],
  ['Cobertura Fini dentadura', 7, 15, 30],
  ['Coco ralado',           7,  15,  30],
  ['Confete',              10,  30,  30],
  ['Cookies',              10,  20,  20],
  ['Creme de Ovomaltine',  10,  20,  30],
  ['Doce de leite',        10,  30,  45],
  ['Farinha láctea',        7,  13,  26],
  ['Ferrero Rocher',       14,  14,  14],
  ['Flocos crocantes',     13,  26,  42],
  ['Granola',              13,  30,  42],
  ['Kinder Bueno',         21,  21,  21],
  ['Kiwi',                 20,  80, 120],
  ['KitKat',               11,  22,  22],
  ['Leite condensado',     10,  30,  60],
  ['Leite Ninho',          13,  25,  50],
  ['Manga',                20,  80, 100],
  ['Morango',              20,  50, 120],
  ['Negresco',             10,  20,  30],
  ['Nescau Chocoball',      5,  10,  20],
  ['Nutella',              20,  20,  40],
  ['Ouro Branco',          20,  20,  20],
  ['Ovomaltine',           13,  20,  26],
  ['Paçoquinha',           13,  13,  26],
  ['Raffaello',            11,  11,  11],
  ['Sonho de Valsa',       20,  20,  20],
  ['Stikadinho',           12,  12,  24],
  ['Sucrilhos',             5,  10,  20],
  ['Tubinho de chocolate',  7,  14,  22],
  ['Uva',                  20,  80, 120],
];

export async function seedComplementGramages() {
  let created = 0;
  let skipped = 0;

  for (const [name, small, medium, large] of COMPLEMENT_DATA) {
    // Find or create product with category 'complemento'
    let [product] = await db
      .select()
      .from(products)
      .where(eq(products.name, name))
      .limit(1);

    if (!product) {
      [product] = await db.insert(products).values({
        name,
        defaultUnit: 'g',
        category: 'complemento',
      }).returning();
    } else if (product.category !== 'complemento') {
      await db.update(products).set({ category: 'complemento' }).where(eq(products.id, product.id));
    }

    // Insert gramages for each tier (skip if already exists)
    for (const [tier, qty] of [['small', small], ['medium', medium], ['large', large]] as const) {
      const [existing] = await db
        .select()
        .from(complementGramages)
        .where(
          and(
            eq(complementGramages.productId, product.id),
            eq(complementGramages.sizeTier, tier),
          )
        )
        .limit(1);

      if (existing) {
        skipped++;
        continue;
      }

      await db.insert(complementGramages).values({
        productId: product.id,
        sizeTier: tier,
        quantityG: String(qty),
      });
      created++;
    }
  }

  return { created, skipped, total: COMPLEMENT_DATA.length * 3 };
}
