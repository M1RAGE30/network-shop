import { Request, Response } from "express";
import prisma from "../lib/prisma";

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

const pickProductFields = (body: Record<string, unknown>) =>
  Object.fromEntries(
    ALLOWED_PRODUCT_FIELDS.filter((k) => k in body).map((k) => [
      k,
      body[k as ProductField],
    ]),
  );

export const getProducts = async (req: Request, res: Response) => {
  const {
    category,
    brand,
    minPrice,
    maxPrice,
    search,
    page = "1",
    limit = "12",
    sort = "newest",
    specs,
  } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (category) where.category = { slug: category };
  if (brand) where.brand = { name: brand };
  if (search) where.name = { contains: search };
  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice && { gte: parseFloat(minPrice) }),
      ...(maxPrice && { lte: parseFloat(maxPrice) }),
    };
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  const take = Math.min(500, Math.max(1, parseInt(limit) || 12));
  const skip = (pageNum - 1) * take;

  const orderBy: Record<string, string> = {};
  switch (sort) {
    case "price-asc":
      orderBy.price = "asc";
      break;
    case "price-desc":
      orderBy.price = "desc";
      break;
    case "name-asc":
      orderBy.name = "asc";
      break;
    case "name-desc":
      orderBy.name = "desc";
      break;
    case "newest":
    default:
      orderBy.createdAt = "desc";
      break;
  }

  let specFilters: Record<string, string> = {};
  if (specs) {
    try {
      const parsed = JSON.parse(specs);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        specFilters = Object.fromEntries(
          Object.entries(parsed)
            .filter(([, value]) => typeof value === "string" && value.trim())
            .map(([key, value]) => [key, (value as string).trim()]),
        );
      }
    } catch {
      specFilters = {};
    }
  }

  const allProducts = await prisma.product.findMany({
    where,
    include: {
      category: true,
      brand: true,
      reviews: { select: { rating: true } },
    },
    orderBy,
  });

  const filteredProducts = Object.keys(specFilters).length
    ? allProducts.filter((product) => {
        const productSpecs =
          product.specs && typeof product.specs === "object"
            ? (product.specs as Record<string, unknown>)
            : {};

        return Object.entries(specFilters).every(([key, value]) => {
          const specValue = productSpecs[key];
          return typeof specValue === "string" && specValue === value;
        });
      })
    : allProducts;

  const products = filteredProducts.slice(skip, skip + take);
  const total = filteredProducts.length;

  return res.json({
    products,
    total,
    page: pageNum,
    pages: Math.ceil(total / take),
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
