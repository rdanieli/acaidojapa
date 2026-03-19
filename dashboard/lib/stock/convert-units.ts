/**
 * Unit conversion utilities for stock management.
 * All conversions go through grams as the canonical unit.
 */

export function convertToGrams(quantity: number, unit: string, unitWeightG?: number | null): number | null {
  switch (unit.toLowerCase()) {
    case 'g':
      return quantity;
    case 'kg':
      return quantity * 1000;
    case 'l':
      return quantity * 1000; // 1L ≈ 1000ml ≈ 1000g (approx for liquids)
    case 'ml':
      return quantity;
    case 'cx':
    case 'pct':
    case 'sc':
    case 'un':
      if (unitWeightG) return quantity * unitWeightG;
      return null; // can't convert without weight per unit
    default:
      return null;
  }
}

export function convertFromGrams(grams: number, targetUnit: string, unitWeightG?: number | null): number | null {
  switch (targetUnit.toLowerCase()) {
    case 'g':
      return grams;
    case 'kg':
      return grams / 1000;
    case 'l':
      return grams / 1000;
    case 'ml':
      return grams;
    case 'cx':
    case 'pct':
    case 'sc':
    case 'un':
      if (unitWeightG) return grams / unitWeightG;
      return null;
    default:
      return null;
  }
}

/**
 * Convert a quantity from one unit to another.
 * Returns null if conversion is not possible.
 */
export function convertUnits(
  quantity: number,
  fromUnit: string,
  toUnit: string,
  unitWeightG?: number | null,
): number | null {
  if (fromUnit.toLowerCase() === toUnit.toLowerCase()) return quantity;

  const grams = convertToGrams(quantity, fromUnit, unitWeightG);
  if (grams == null) return null;

  return convertFromGrams(grams, toUnit, unitWeightG);
}
