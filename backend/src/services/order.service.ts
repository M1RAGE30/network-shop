import prisma from "../lib/prisma";
import { Prisma } from "../../generated/client";

class CheckoutError extends Error {
  constructor(
    public code: "CART_EMPTY" | "INVALID_QUANTITY" | "OUT_OF_STOCK",
    public productId?: number,
  ) {
    super(code);
  }
}

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
}) => {
  try {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const cartItems = await tx.cartItem.findMany({
        where: { userId },
        include: { product: true },
      });

      if (!cartItems.length) {
        throw new CheckoutError("CART_EMPTY");
      }

      for (const item of cartItems) {
        if (item.quantity <= 0) {
          throw new CheckoutError("INVALID_QUANTITY");
        }

        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });

        if (updated.count !== 1) {
          throw new CheckoutError("OUT_OF_STOCK", item.productId);
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
  } catch (e) {
    if (e instanceof CheckoutError) {
      return { error: e.code, productId: e.productId };
    }
    throw e;
  }
};
