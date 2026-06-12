import { Response } from "express";
import { validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { OrderStatus } from "../../generated/client";
import { AuthRequest } from "../middleware/auth.middleware";
import { createOrderFromCart } from "../services/order.service";

const STOCK_RESERVED_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED"];

const parseOrderId = (raw: string) => {
  const id = parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const getOrders = async (req: AuthRequest, res: Response) => {
  const where = req.userRole === "ADMIN" ? {} : { userId: req.userId };
  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { include: { product: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json(orders);
};

export const getOrder = async (
  req: AuthRequest<{ id: string }>,
  res: Response,
) => {
  const orderId = parseOrderId(req.params.id);
  if (!orderId) return res.status(400).json({ message: "Invalid order id" });

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      ...(req.userRole !== "ADMIN" && { userId: req.userId }),
    },
    include: { items: { include: { product: true } } },
  });
  if (!order) return res.status(404).json({ message: "Not found" });
  return res.json(order);
};

export const createOrder = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { address, comment, phone } = req.body;
  const result = await createOrderFromCart({
    userId: req.userId!,
    address,
    phone,
    comment,
  });

  if ("error" in result) {
    if (result.error === "CART_EMPTY") {
      return res.status(400).json({ message: "Cart is empty" });
    }
    if (result.error === "INVALID_QUANTITY") {
      return res.status(400).json({ message: "Invalid quantity in cart" });
    }
    return res.status(409).json({
      message: "Some items are out of stock",
      productId: result.productId,
    });
  }

  return res.status(201).json(result.order);
};

export const updateOrderStatus = async (
  req: AuthRequest<{ id: string }>,
  res: Response,
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const orderId = parseOrderId(req.params.id);
  if (!orderId) return res.status(400).json({ message: "Invalid order id" });

  const status = req.body.status as OrderStatus;

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!existing) return res.status(404).json({ message: "Not found" });

  if (status === existing.status) {
    return res.json(existing);
  }

  if (
    status === "CANCELLED" &&
    STOCK_RESERVED_STATUSES.includes(existing.status)
  ) {
    const order = await prisma.$transaction(async (tx) => {
      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      return tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
        include: { items: { include: { product: true } } },
      });
    });
    return res.json(order);
  }

  if (status === "CANCELLED" && !STOCK_RESERVED_STATUSES.includes(existing.status)) {
    return res.status(400).json({
      message: "Only pending or confirmed orders can be cancelled",
    });
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: { items: { include: { product: true } } },
  });
  return res.json(order);
};

export const cancelOwnOrder = async (
  req: AuthRequest<{ id: string }>,
  res: Response,
) => {
  const orderId = parseOrderId(req.params.id);
  if (!orderId) return res.status(400).json({ message: "Invalid order id" });

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: req.userId },
    include: { items: true },
  });
  if (!order) return res.status(404).json({ message: "Not found" });
  if (!STOCK_RESERVED_STATUSES.includes(order.status)) {
    return res
      .status(400)
      .json({ message: "Only pending or confirmed orders can be cancelled" });
  }

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
    await tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });
  });

  const updated = await prisma.order.findFirst({
    where: { id: orderId, userId: req.userId },
    include: { items: { include: { product: true } } },
  });
  return res.json(updated);
};
