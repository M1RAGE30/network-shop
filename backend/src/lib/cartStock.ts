import prisma from "./prisma";

export async function getProductStock(productId: number) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { stock: true },
  });
  if (!product || product.stock < 1) return null;
  return product.stock;
}

export async function capCartQuantity(
  userId: number,
  productId: number,
  requested: number,
  mode: "increment" | "set",
): Promise<{ quantity: number } | { error: "OUT_OF_STOCK" }> {
  const stock = await getProductStock(productId);
  if (stock === null) return { error: "OUT_OF_STOCK" };

  const existing = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { quantity: true },
  });

  const raw =
    mode === "increment"
      ? (existing?.quantity ?? 0) + requested
      : requested;

  if (raw < 1) return { error: "OUT_OF_STOCK" };

  return { quantity: Math.min(raw, stock) };
}
