import { Router } from "express";
import crypto from "crypto";
import { authenticate, AuthRequest } from "../middleware/auth.middleware";
import prisma from "../lib/prisma";
import { ensureRoomAccess } from "../services/chat-access.service";

const router = Router();
router.use(authenticate);

const includeMessages = {
  messages: {
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

const generateRoomToken = (roomId: number): string =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET!)
    .update(String(roomId))
    .digest("hex")
    .slice(0, 16);

router.get("/room", async (req: AuthRequest, res) => {
  const room = await prisma.chatRoom.upsert({
    where: { userId: req.userId },
    update: {},
    create: { userId: req.userId },
    include: includeMessages,
  });
  return res.json({ ...room, token: generateRoomToken(room.id) });
});

router.get("/room/by-token/:token", async (req: AuthRequest, res) => {
  const room = await prisma.chatRoom.findFirst({
    where: { userId: req.userId },
    include: includeMessages,
  });
  if (!room) return res.status(404).json({ message: "Not found" });
  if (generateRoomToken(room.id) !== req.params.token) {
    return res.status(403).json({ message: "Forbidden" });
  }
  return res.json(room);
});

router.get("/room/:id", async (req: AuthRequest, res) => {
  const roomId = parseInt(req.params.id as string);
  if (Number.isNaN(roomId)) {
    return res.status(400).json({ message: "Invalid room id" });
  }

  const access = await ensureRoomAccess(roomId, req.userId!, req.userRole!);
  if (!access.ok) {
    return res
      .status(access.status)
      .json({ message: access.status === 404 ? "Not found" : "Forbidden" });
  }

  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: includeMessages,
  });
  return res.json(room);
});

router.get("/unread", async (req: AuthRequest, res) => {
  const count = await prisma.message.count({
    where: {
      chatRoom: { userId: req.userId },
      isRead: false,
      user: { role: "ADMIN" },
    },
  });
  return res.json({ count });
});

export default router;
