/**
 * Compute the cost (R$) of `quantityG` grams of an ingredient product.
 *
 * `costPerUnit` is stored as cost per `defaultUnit` (the schema comment in
 * lib/db/schema.ts says "cost per default unit"). The interpretation depends
 * on the unit:
 *   - 'g'  → cost per gram   → cost = quantityG * costPerUnit
 *   - 'kg' → cost per kg     → cost = (quantityG / 1000) * costPerUnit
 *   - 'L'  → cost per liter  → cost = (quantityG / 1000) * costPerUnit (treats 1g ≈ 1ml)
 *   - 'un' → cost per package → needs unitWeightG to convert grams ↔ unit
 *
 * Mirrors the inline logic in app/api/dashboard/financial/route.ts so the
 * Financeiro CMV and the Fichas Técnicas custo always agree.
 */
export function ingredientCostForGrams(
  costPerUnit: number,
  defaultUnit: string,
  unitWeightG: number | null,
  quantityG: number,
): number {
  if (!costPerUnit || costPerUnit === 0) return 0;
  if (!quantityG || quantityG === 0) return 0;

  switch (defaultUnit) {
    case 'g':
      return quantityG * costPerUnit;
    case 'kg':
      return (quantityG / 1000) * costPerUnit;
    case 'ml':
      return quantityG * costPerUnit;
    case 'L':
      return (quantityG / 1000) * costPerUnit;
    case 'un':
      if (unitWeightG && unitWeightG > 0) {
        return (quantityG / unitWeightG) * costPerUnit;
      }
      return quantityG * costPerUnit;
    default:
      return (quantityG / 1000) * costPerUnit;
  }
}
