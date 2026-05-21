export function parseSpecFilters(value: string | null): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

export function countAppliedCatalogFilters(
  params: URLSearchParams,
  specFilters: Record<string, string>,
): number {
  let count = 0;
  if (params.get("brand")) count += 1;
  if (params.get("minPrice") || params.get("maxPrice")) count += 1;
  count += Object.keys(specFilters).length;
  return count;
}
