import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";
import { createOrderFromCart } from "../services/order.service";

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
  const order = await prisma.order.findFirst({
    where: {
      id: parseInt(req.params.id),
      ...(req.userRole !== "ADMIN" && { userId: req.userId }),
    },
    include: { items: { include: { product: true } } },
  });
  if (!order) return res.status(404).json({ message: "Not found" });
  return res.json(order);
};

export const createOrder = async (req: AuthRequest, res: Response) => {
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
  const order = await prisma.order.update({
    where: { id: parseInt(req.params.id) },
    data: { status: req.body.status },
  });
  return res.json(order);
};

export const cancelOwnOrder = async (
  req: AuthRequest<{ id: string }>,
  res: Response,
) => {
  const orderId = parseInt(req.params.id);
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: req.userId },
    include: { items: true },
  });
  if (!order) return res.status(404).json({ message: "Not found" });
  if (!["PENDING", "CONFIRMED"].includes(order.status)) {
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
