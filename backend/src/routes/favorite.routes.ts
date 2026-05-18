import { Router } from "express";
import { authenticate, requireNotAdmin } from "../middleware/auth.middleware";
import { AuthRequest } from "../middleware/auth.middleware";
import prisma from "../lib/prisma";

const router = Router();
router.use(authenticate, requireNotAdmin);

router.get("/", async (req: AuthRequest, res) => {
  const favs = await prisma.favorite.findMany({
    where: { userId: req.userId },
    include: { product: { include: { brand: true, category: true } } },
  });
  return res.json(favs);
});

router.post("/:productId", async (req: AuthRequest, res) => {
  const productId = parseInt(req.params.productId);
  const fav = await prisma.favorite.upsert({
    where: { userId_productId: { userId: req.userId!, productId } },
    update: {},
    create: { userId: req.userId!, productId },
  });
  return res.json(fav);
});

router.delete("/:productId", async (req: AuthRequest, res) => {
  await prisma.favorite.delete({
    where: {
      userId_productId: {
        userId: req.userId!,
        productId: parseInt(req.params.productId),
      },
    },
  });
  return res.status(204).send();
});

export default router;
