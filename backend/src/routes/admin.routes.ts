import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth.middleware";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  buildAdminStatsExcelHtml,
  type AdminStatsExportPayload,
} from "../lib/adminStatsExport";

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

router.get("/stats/export", async (req, res) => {
  const date = String(req.query.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res
      .status(400)
      .json({ message: "Передайте дату в формате YYYY-MM-DD" });
  }

  const from = new Date(`${date}T00:00:00`);
  const to = new Date(`${date}T23:59:59.999`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return res.status(400).json({ message: "Некорректная дата" });
  }

  const dayRange = { createdAt: { gte: from, lte: to } };

  const [
    orders,
    newUsers,
    reviews,
    messages,
    usersTotal,
    productsTotal,
    totalOrders,
    chatsUnread,
    pendingOrders,
    statusGroupsDay,
    statusGroupsAll,
    revenueDay,
    revenueAll,
    categoryGroups,
    lowStock,
    orderItemsDay,
  ] = await Promise.all([
    prisma.order.findMany({
      where: dayRange,
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          select: {
            quantity: true,
            price: true,
            product: { select: { name: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: dayRange,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
      },
    }),
    prisma.review.findMany({
      where: dayRange,
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { name: true } },
      },
    }),
    prisma.message.findMany({
      where: dayRange,
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { name: true, role: true } },
      },
    }),
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.message.count({
      where: { isRead: false, user: { role: "USER" } },
    }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.groupBy({
      by: ["status"],
      where: dayRange,
      _count: { id: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: "DELIVERED", ...dayRange },
    }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: "DELIVERED" },
    }),
    prisma.product.groupBy({
      by: ["categoryId"],
      _count: { id: true },
    }),
    prisma.product.findMany({
      where: { stock: { lte: 5 } },
      orderBy: [{ stock: "asc" }, { name: "asc" }],
      take: 200,
      select: {
        id: true,
        name: true,
        stock: true,
        price: true,
        category: { select: { name: true } },
        brand: { select: { name: true } },
      },
    }),
    prisma.orderItem.findMany({
      where: { order: dayRange },
      select: {
        quantity: true,
        price: true,
        product: { select: { name: true } },
      },
    }),
  ]);

  const ordersByStatusDay = Object.fromEntries(
    statusGroupsDay.map((row) => [row.status, row._count.id]),
  );
  const ordersByStatusAll = Object.fromEntries(
    statusGroupsAll.map((row) => [row.status, row._count.id]),
  );

  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
  });
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const productsByCategory = categoryGroups
    .map((row) => ({
      categoryName: categoryNameById.get(row.categoryId) ?? "–",
      count: row._count.id,
    }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName, "ru"));

  const soldMap = new Map<string, { quantity: number; revenue: number }>();
  for (const item of orderItemsDay) {
    const name = item.product?.name ?? "–";
    const prev = soldMap.get(name) ?? { quantity: 0, revenue: 0 };
    const lineTotal = Number(item.price) * item.quantity;
    soldMap.set(name, {
      quantity: prev.quantity + item.quantity,
      revenue: prev.revenue + lineTotal,
    });
  }
  const topSold = [...soldMap.entries()]
    .map(([productName, stats]) => ({ productName, ...stats }))
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);

  const payload: AdminStatsExportPayload = {
    date,
    summary: {
      ordersDay: orders.length,
      revenueDay: Number(revenueDay._sum.totalAmount ?? 0),
      newUsersDay: newUsers.length,
      reviewsDay: reviews.length,
      messagesDay: messages.length,
      ordersByStatusDay,
      totalOrders,
      totalUsers: usersTotal,
      totalProducts: productsTotal,
      revenueAll: Number(revenueAll._sum.totalAmount ?? 0),
      pendingOrders,
      unreadChats: chatsUnread,
      ordersByStatusAll,
    },
    orders,
    newUsers,
    reviews,
    messages,
    productsByCategory,
    lowStock,
    topSold,
  };

  const html = buildAdminStatsExcelHtml(payload);
  const filename = `admin-stats-${date}.xls`;
  res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send("\uFEFF" + html);
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
