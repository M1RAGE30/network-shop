import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import { Response } from "express";
import {
  authenticate,
  AuthRequest,
  requireNotAdmin,
} from "../middleware/auth.middleware";
import prisma from "../lib/prisma";

const router = Router();

router.get("/product/:productId", async (req, res) => {
  const productId = parseInt(req.params.productId as string);
  if (Number.isNaN(productId))
    return res.status(400).json({ message: "Invalid product id" });
  const reviews = await prisma.review.findMany({
    where: { productId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return res.json(reviews);
});

router.post(
  "/product/:productId",
  authenticate,
  requireNotAdmin,
  [
    param("productId").isInt({ min: 1 }),
    body("rating").isInt({ min: 1, max: 5 }),
    body("comment").optional().isString().trim().isLength({ max: 1000 }),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { rating, comment } = req.body;
    const review = await prisma.review.upsert({
      where: {
        userId_productId: {
          userId: req.userId!,
          productId: parseInt(req.params.productId as string),
        },
      },
      update: { rating, comment },
      create: {
        userId: req.userId!,
        productId: parseInt(req.params.productId as string),
        rating,
        comment,
      },
    });
    return res.json(review);
  },
);

router.delete(
  "/:reviewId",
  authenticate,
  [param("reviewId").isInt({ min: 1 })],
  async (req: AuthRequest<{ reviewId: string }>, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const reviewId = parseInt(req.params.reviewId, 10);
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, userId: true },
    });
    if (!review) return res.status(404).json({ message: "Отзыв не найден" });

    if (req.userRole !== "ADMIN" && review.userId !== req.userId) {
      return res.status(403).json({ message: "Недостаточно прав" });
    }

    await prisma.review.delete({ where: { id: reviewId } });
    return res.status(204).send();
  },
);

export default router;
