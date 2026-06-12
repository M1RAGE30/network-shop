import { normalizeSpecDisplayValue } from "./specNormalize";

export type SpecFilterMode = "exact" | "gte" | "lte";

const GTE_SPEC_KEYS = new Set(["Максимальная скорость связи"]);

const LTE_SPEC_KEYS = new Set(["Длина кабеля"]);

export function getSpecFilterMode(key: string): SpecFilterMode {
  if (LTE_SPEC_KEYS.has(key)) return "lte";
  if (GTE_SPEC_KEYS.has(key)) return "gte";
  return "exact";
}

export function parseNumericSpec(value: string): number | null {
  const numbers = value.match(/\d+(?:[.,]\d+)?/g);
  if (!numbers?.length) return null;

  const parsed = numbers.map((part) => Number(part.replace(",", ".")));
  return Math.max(...parsed);
}

export function matchesSpecFilterValue(
  key: string,
  filterValue: string,
  productSpecValue: unknown,
): boolean {
  if (typeof productSpecValue !== "string" || !productSpecValue.trim()) {
    return false;
  }

  const productValue = normalizeSpecDisplayValue(productSpecValue.trim());
  const normalizedFilter = normalizeSpecDisplayValue(filterValue.trim());
  const mode = getSpecFilterMode(key);

  if (mode === "exact") {
    return productValue === normalizedFilter;
  }

  const filterNum = parseNumericSpec(normalizedFilter);
  const productNum = parseNumericSpec(productValue);

  if (filterNum == null || productNum == null) {
    return productValue === normalizedFilter;
  }

  if (mode === "gte") return productNum >= filterNum;
  return productNum <= filterNum;
}

export function matchesSpecFilters(
  specs: unknown,
  specFilters: Record<string, string>,
): boolean {
  if (!Object.keys(specFilters).length) return true;

  const productSpecs =
    specs && typeof specs === "object"
      ? (specs as Record<string, unknown>)
      : {};

  return Object.entries(specFilters).every(([key, value]) =>
    matchesSpecFilterValue(key, value, productSpecs[key]),
  );
}
