import { Router } from "express";
import prisma from "../lib/prisma";
import { slugify } from "../lib/slugify";
import { authenticate, requireAdmin } from "../middleware/auth.middleware";

const router = Router();

router.get("/", async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return res.json(categories);
});

router.post("/", authenticate, requireAdmin, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const slugInput = String(req.body?.slug ?? "").trim();
  const imageUrl = req.body?.imageUrl
    ? String(req.body.imageUrl).trim()
    : null;

  if (!name) {
    return res.status(400).json({ message: "Название категории обязательно" });
  }

  const slug = slugInput || slugify(name);
  if (!slug) {
    return res.status(400).json({ message: "Укажите корректный URL (slug)" });
  }

  try {
    const category = await prisma.category.create({
      data: { name, slug, imageUrl: imageUrl || null },
    });
    return res.status(201).json(category);
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return res
        .status(409)
        .json({ message: "Категория с таким названием или URL уже существует" });
    }
    throw e;
  }
});

export default router;
