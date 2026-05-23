import { Router } from "express";
import prisma from "../lib/prisma";
import { authenticate, requireAdmin } from "../middleware/auth.middleware";

const router = Router();

router.get("/", async (_req, res) => {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return res.json(brands);
});

router.post("/", authenticate, requireAdmin, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const logoUrl = req.body?.logoUrl ? String(req.body.logoUrl).trim() : null;

  if (!name) {
    return res.status(400).json({ message: "Название бренда обязательно" });
  }

  try {
    const brand = await prisma.brand.create({
      data: { name, logoUrl: logoUrl || null },
    });
    return res.status(201).json(brand);
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return res
        .status(409)
        .json({ message: "Бренд с таким названием уже существует" });
    }
    throw e;
  }
});

export default router;
