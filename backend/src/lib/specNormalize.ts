export function normalizeSpecDisplayValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const plainNumber = trimmed.match(/^(-?\d+)(?:[.,](\d+))?$/);
  if (plainNumber) {
    const intPart = plainNumber[1];
    const frac = plainNumber[2];
    if (!frac || /^0+$/.test(frac)) return intPart;
    return `${intPart},${frac.replace(/0+$/, "") || "0"}`;
  }

  return trimmed;
}

export function normalizeProductSpecs(
  specs: unknown,
): Record<string, string> | null {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) {
    return null;
  }

  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(specs)) {
    if (typeof value !== "string") continue;
    const normalized = normalizeSpecDisplayValue(value);
    if (normalized) next[key] = normalized;
  }

  return Object.keys(next).length ? next : null;
}
