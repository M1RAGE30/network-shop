import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth.middleware";
import prisma from "../lib/prisma";

const router = Router();
router.use(authenticate, requireAdmin);

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isEmailVerified: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });
  return res.json(users);
});

router.put("/:id/role", async (req, res) => {
  const { role } = req.body;
  if (!["USER", "ADMIN"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  try {
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });
    return res.json(user);
  } catch {
    return res.status(404).json({ message: "User not found" });
  }
});

router.put("/:id", async (req, res) => {
  const { name, email } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { name, email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
      },
    });
    return res.json(user);
  } catch {
    return res.status(404).json({ message: "User not found" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    return res.status(204).send();
  } catch {
    return res.status(404).json({ message: "User not found" });
  }
});

export default router;
