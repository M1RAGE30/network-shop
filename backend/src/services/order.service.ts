import prisma from "../lib/prisma";
import { Prisma } from "../../generated/client";

export const createOrderFromCart = async ({
  userId,
  address,
  phone,
  comment,
}: {
  userId: number;
  address: string;
  phone?: string;
  comment?: string;
}) =>
  prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const cartItems = await tx.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });

    if (!cartItems.length) {
      return { error: "CART_EMPTY" as const };
    }

    for (const item of cartItems) {
      if (item.quantity <= 0) {
        return { error: "INVALID_QUANTITY" as const };
      }

      const updated = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });

      if (updated.count !== 1) {
        return { error: "OUT_OF_STOCK" as const, productId: item.productId };
      }
    }

    const totalAmount = cartItems.reduce(
      (sum: number, item: { quantity: number; product: { price: unknown } }) =>
        sum + Number(item.product.price) * item.quantity,
      0,
    );

    const order = await tx.order.create({
      data: {
        userId,
        address,
        phone,
        comment,
        totalAmount,
        items: {
          create: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    await tx.cartItem.deleteMany({ where: { userId } });

    return { order };
  });
