export const ADMIN_PRODUCT_CATEGORY_SLUGS = [
  "routers",
  "wifi-adapters",
  "switches",
  "access-points",
  "usb-adapters",
  "storage",
  "patch-cords",
] as const;

export type AdminProductCategorySlug =
  (typeof ADMIN_PRODUCT_CATEGORY_SLUGS)[number];

export function filterAdminProductCategories<
  T extends { slug: string; name?: string },
>(categories: T[]): T[] {
  const order = new Map(
    ADMIN_PRODUCT_CATEGORY_SLUGS.map((slug, index) => [slug, index]),
  );
  return categories
    .filter((c) => order.has(c.slug))
    .sort(
      (a, b) =>
        (order.get(a.slug) ?? 999) - (order.get(b.slug) ?? 999),
    );
}

export function defaultAdminProductCategorySlug(
  categories: { slug: string }[],
): string {
  const slugs = filterAdminProductCategories(categories).map((c) => c.slug);
  if (slugs.includes("patch-cords")) return "patch-cords";
  return slugs[0] ?? "";
}
