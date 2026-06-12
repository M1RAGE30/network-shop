import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";
import { capCartQuantity } from "../lib/cartStock";

const parseProductId = (raw: string) => {
  const id = parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const getCart = async (req: AuthRequest, res: Response) => {
  const items = await prisma.cartItem.findMany({
    where: { userId: req.userId },
    include: { product: { include: { brand: true } } },
  });
  return res.json(items);
};

export const addToCart = async (req: AuthRequest, res: Response) => {
  const { productId, quantity = 1 } = req.body;
  if (!Number.isInteger(productId) || productId < 1) {
    return res.status(400).json({ message: "Invalid productId" });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    return res.status(400).json({ message: "Invalid quantity" });
  }
  const capped = await capCartQuantity(
    req.userId!,
    productId,
    quantity,
    "increment",
  );
  if ("error" in capped) {
    return res.status(409).json({ message: "Товар отсутствует на складе" });
  }

  const item = await prisma.cartItem.upsert({
    where: { userId_productId: { userId: req.userId!, productId } },
    update: { quantity: capped.quantity },
    create: { userId: req.userId!, productId, quantity: capped.quantity },
    include: { product: true },
  });
  return res.json(item);
};

export const updateCart = async (
  req: AuthRequest<{ productId: string }>,
  res: Response,
) => {
  const { quantity } = req.body;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    return res.status(400).json({ message: "Invalid quantity" });
  }
  const productId = parseProductId(req.params.productId);
  if (!productId) {
    return res.status(400).json({ message: "Invalid productId" });
  }

  const existing = await prisma.cartItem.findUnique({
    where: {
      userId_productId: { userId: req.userId!, productId },
    },
  });
  if (!existing) {
    return res.status(404).json({ message: "Item not in cart" });
  }

  const capped = await capCartQuantity(
    req.userId!,
    productId,
    quantity,
    "set",
  );
  if ("error" in capped) {
    return res.status(409).json({ message: "Товар отсутствует на складе" });
  }

  const item = await prisma.cartItem.update({
    where: {
      userId_productId: {
        userId: req.userId!,
        productId,
      },
    },
    data: { quantity: capped.quantity },
  });
  return res.json(item);
};

export const removeFromCart = async (
  req: AuthRequest<{ productId: string }>,
  res: Response,
) => {
  const productId = parseProductId(req.params.productId);
  if (!productId) {
    return res.status(400).json({ message: "Invalid productId" });
  }

  const existing = await prisma.cartItem.findUnique({
    where: {
      userId_productId: { userId: req.userId!, productId },
    },
  });
  if (!existing) {
    return res.status(404).json({ message: "Item not in cart" });
  }

  await prisma.cartItem.delete({
    where: {
      userId_productId: {
        userId: req.userId!,
        productId,
      },
    },
  });
  return res.status(204).send();
};

export const clearCart = async (req: AuthRequest, res: Response) => {
  await prisma.cartItem.deleteMany({ where: { userId: req.userId } });
  return res.status(204).send();
};

interface BulkItem {
  productId: number;
  quantity: number;
}

export const bulkAddToCart = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const raw = Array.isArray(req.body?.items) ? (req.body.items as unknown[]) : [];

  const items: BulkItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;
    const productId = Number(obj.productId);
    const quantity = Number(obj.quantity ?? 1);
    if (!Number.isInteger(productId) || productId < 1) continue;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) continue;
    items.push({ productId, quantity });
  }

  if (items.length === 0) {
    return res.status(400).json({ message: "Список товаров пуст" });
  }

  const existingProducts = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    select: { id: true },
  });
  const validIds = new Set(existingProducts.map((p) => p.id));

  const merged = new Map<number, number>();
  for (const item of items) {
    if (!validIds.has(item.productId)) continue;
    merged.set(
      item.productId,
      (merged.get(item.productId) ?? 0) + item.quantity,
    );
  }

  if (merged.size === 0) {
    return res.status(400).json({ message: "Товары не найдены" });
  }

  const cappedItems: { productId: number; quantity: number }[] = [];
  for (const [productId, quantity] of merged) {
    const capped = await capCartQuantity(
      userId,
      productId,
      quantity,
      "increment",
    );
    if ("error" in capped) continue;
    cappedItems.push({ productId, quantity: capped.quantity });
  }

  if (cappedItems.length === 0) {
    return res.status(409).json({ message: "Товары отсутствует на складе" });
  }

  await prisma.$transaction(
    cappedItems.map((item) =>
      prisma.cartItem.upsert({
        where: { userId_productId: { userId, productId: item.productId } },
        update: { quantity: item.quantity },
        create: { userId, productId: item.productId, quantity: item.quantity },
      }),
    ),
  );

  const cart = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: { include: { brand: true } } },
  });

  return res.json({ added: cappedItems.length, items: cart });
};
