import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  const brands = await prisma.brand.findMany({
    include: { _count: { select: { products: true } } },
  });
  return res.json(brands);
});

export default router;
