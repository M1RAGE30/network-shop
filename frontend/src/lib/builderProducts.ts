export type BuilderProduct = {
  id: number;
  name: string;
  slug: string;
  price: number;
  imageUrl: string | null;
  brand: { name: string };
  specs?: Record<string, string> | null;
};

export function sortBuilderProducts<T extends BuilderProduct>(products: T[]): T[] {
  return [...products].sort((a, b) => {
    const byBrand = (a.brand?.name ?? "").localeCompare(
      b.brand?.name ?? "",
      "ru",
      { sensitivity: "base" },
    );
    if (byBrand !== 0) return byBrand;
    return a.name.localeCompare(b.name, "ru", {
      numeric: true,
      sensitivity: "base",
    });
  });
}

export function builderProductParts(product: BuilderProduct): {
  brand: string | null;
  name: string;
} {
  const brand = product.brand?.name?.trim() ?? "";
  const name = product.name.trim();
  if (!brand || name.toLowerCase().startsWith(brand.toLowerCase())) {
    return { brand: null, name };
  }
  return { brand, name };
}

export function formatBuilderProductLabel(product: BuilderProduct): string {
  const { brand, name } = builderProductParts(product);
  if (!brand) return name;
  return `${brand} · ${name}`;
}

const EXTENDER_MARKERS =
  /усилител|range extender|wi-?fi extender|репитер|repeater|extender/i;

export function filterWifiBuilderRouters<T extends BuilderProduct>(
  products: T[],
): T[] {
  return products.filter((product) => {
    const name = product.name;
    const type = product.specs?.["Тип"] ?? "";
    if (EXTENDER_MARKERS.test(name) || EXTENDER_MARKERS.test(type)) {
      return false;
    }
    return true;
  });
}
