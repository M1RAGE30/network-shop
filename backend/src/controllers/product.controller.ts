import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

const ALLOWED_PRODUCT_FIELDS = [
  "name",
  "slug",
  "description",
  "price",
  "stock",
  "categoryId",
  "brandId",
  "imageUrl",
  "specs",
] as const;

type ProductField = (typeof ALLOWED_PRODUCT_FIELDS)[number];

const PRODUCT_LIST_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true } },
  reviews: { select: { rating: true } },
} as const;

const pickProductFields = (body: Record<string, unknown>) =>
  Object.fromEntries(
    ALLOWED_PRODUCT_FIELDS.filter((k) => k in body).map((k) => [
      k,
      body[k as ProductField],
    ]),
  );

function buildProductWhere(
  query: Record<string, string>,
  userRole?: string,
): Record<string, unknown> {
  const { category, brand, minPrice, maxPrice, search } = query;
  const where: Record<string, unknown> = {};
  const includeOutOfStock =
    query.includeOutOfStock === "1" && userRole === "ADMIN";
  if (!includeOutOfStock) where.stock = { gt: 0 };
  if (category) where.category = { slug: category };
  if (brand) where.brand = { name: brand };
  if (search) where.name = { contains: search };
  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice && { gte: parseFloat(minPrice) }),
      ...(maxPrice && { lte: parseFloat(maxPrice) }),
    };
  }
  return where;
}

function parseSpecFilters(specs?: string): Record<string, string> {
  if (!specs) return {};
  try {
    const parsed = JSON.parse(specs);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => typeof value === "string" && value.trim())
        .map(([key, value]) => [key, (value as string).trim()]),
    );
  } catch {
    return {};
  }
}

function matchesSpecFilters(
  specs: unknown,
  specFilters: Record<string, string>,
): boolean {
  if (!Object.keys(specFilters).length) return true;
  const productSpecs =
    specs && typeof specs === "object"
      ? (specs as Record<string, unknown>)
      : {};
  return Object.entries(specFilters).every(([key, value]) => {
    const specValue = productSpecs[key];
    return typeof specValue === "string" && specValue === value;
  });
}

function resolveSort(sort: string) {
  switch (sort) {
    case "price-asc":
      return { price: "asc" as const };
    case "price-desc":
      return { price: "desc" as const };
    case "name-asc":
      return { name: "asc" as const };
    case "name-desc":
      return { name: "desc" as const };
    case "newest":
    default:
      return { createdAt: "desc" as const };
  }
}

export const getProducts = async (req: AuthRequest, res: Response) => {
  const query = req.query as Record<string, string>;
  const {
    page = "1",
    limit = "12",
    sort = "newest",
    specs,
  } = query;

  const where = buildProductWhere(query, req.userRole);
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const take = Math.min(500, Math.max(1, parseInt(limit, 10) || 12));
  const skip = (pageNum - 1) * take;
  const orderBy = resolveSort(sort);
  const specFilters = parseSpecFilters(specs);

  if (!Object.keys(specFilters).length) {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: PRODUCT_LIST_INCLUDE,
        orderBy,
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);
    return res.json({
      products,
      total,
      page: pageNum,
      pages: Math.ceil(total / take),
    });
  }

  const candidates = await prisma.product.findMany({
    where,
    select: { id: true, specs: true },
    orderBy,
  });
  const matchedIds = candidates
    .filter((product) => matchesSpecFilters(product.specs, specFilters))
    .map((product) => product.id);
  const total = matchedIds.length;
  const pageIds = matchedIds.slice(skip, skip + take);

  if (!pageIds.length) {
    return res.json({
      products: [],
      total,
      page: pageNum,
      pages: Math.ceil(total / take) || 0,
    });
  }

  const products = await prisma.product.findMany({
    where: { id: { in: pageIds } },
    include: PRODUCT_LIST_INCLUDE,
  });
  const orderMap = new Map(pageIds.map((id, index) => [id, index]));
  products.sort(
    (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
  );

  return res.json({
    products,
    total,
    page: pageNum,
    pages: Math.ceil(total / take),
  });
};

export const getProductFilterMeta = async (req: AuthRequest, res: Response) => {
  const { category } = req.query as Record<string, string>;
  const where = buildProductWhere(
    { category: category ?? "", includeOutOfStock: "0" },
    req.userRole,
  );

  const rows = await prisma.product.findMany({
    where,
    select: {
      specs: true,
      brand: { select: { name: true } },
    },
  });

  return res.json({
    products: rows.map((row) => ({
      specs: row.specs,
      brand: row.brand,
    })),
  });
};

export const getProduct = async (
  req: Request<{ slug: string }>,
  res: Response,
) => {
  const product = await prisma.product.findUnique({
    where: { slug: req.params.slug },
    include: {
      category: true,
      brand: true,
      reviews: { include: { user: { select: { name: true } } } },
    },
  });
  if (!product) return res.status(404).json({ message: "Not found" });
  return res.json(product);
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const data = pickProductFields(req.body);
    const product = await prisma.product.create({ data: data as any });
    return res.status(201).json(product);
  } catch {
    return res.status(400).json({ message: "Bad request" });
  }
};

export const updateProduct = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const data = pickProductFields(req.body);
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: data as any,
    });
    return res.json(product);
  } catch {
    return res.status(404).json({ message: "Not found" });
  }
};

export const deleteProduct = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    return res.status(204).send();
  } catch {
    return res.status(404).json({ message: "Not found" });
  }
};
