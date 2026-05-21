import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth.middleware";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticate, requireAdmin);

router.get("/stats", async (_req, res) => {
  const [
    totalOrders,
    totalUsers,
    totalProducts,
    revenue,
    pendingOrders,
    unreadChats,
    statusGroups,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: "DELIVERED" },
    }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.message.count({
      where: { isRead: false, user: { role: "USER" } },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
  ]);

  const ordersByStatus = Object.fromEntries(
    statusGroups.map((row) => [row.status, row._count.id]),
  );

  return res.json({
    totalOrders,
    totalUsers,
    totalProducts,
    revenue: revenue._sum.totalAmount ?? 0,
    pendingOrders,
    unreadChats,
    ordersByStatus,
    recentOrders,
  });
});

router.get("/chats/unread", async (_req, res) => {
  const count = await prisma.message.count({
    where: { isRead: false, user: { role: "USER" } },
  });
  return res.json({ count });
});

router.get("/chats", async (_req, res) => {
  const [rooms, unreadCounts, firstMessages] = await Promise.all([
    prisma.chatRoom.findMany({
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { user: { select: { name: true, role: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.message.groupBy({
      by: ["chatRoomId"],
      where: { isRead: false, user: { role: "USER" } },
      _count: { id: true },
    }),
    prisma.message.findMany({
      where: { user: { role: "USER" } },
      distinct: ["chatRoomId"],
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, id: true } } },
    }),
  ]);

  const unreadMap = new Map(
    unreadCounts.map((u: any) => [u.chatRoomId, u._count.id]),
  );
  const firstMsgMap = new Map(firstMessages.map((m: any) => [m.chatRoomId, m]));

  const enriched = rooms.map((room: any) => ({
    ...room,
    userName:
      (firstMsgMap.get(room.id) as any)?.user?.name ?? `Диалог #${room.id}`,
    unreadCount: unreadMap.get(room.id) ?? 0,
  }));

  return res.json(enriched);
});

router.delete(
  "/chats/:id",
  async (req: AuthRequest & { params: { id: string } }, res) => {
    try {
      await prisma.chatRoom.delete({ where: { id: parseInt(req.params.id) } });
      return res.status(204).send();
    } catch {
      return res.status(404).json({ message: "Not found" });
    }
  },
);

export default router;
