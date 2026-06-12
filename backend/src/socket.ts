import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "./lib/prisma";
import { ensureRoomAccess } from "./services/chat-access.service";

const parseRoomId = (roomId: unknown): number | null => {
  const id = Number(roomId);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const setupSocket = (io: Server) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Unauthorized"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: number;
        role: string;
      };
      socket.data.userId = decoded.id;
      socket.data.role = decoded.role;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    if (socket.data.role === "ADMIN") {
      socket.join("admins");
    } else {
      socket.join(`user_${socket.data.userId}`);
    }

    socket.on("join_room", async (roomId: unknown) => {
      const id = parseRoomId(roomId);
      if (!id) {
        socket.emit("room_error", { roomId, status: 400 });
        return;
      }
      try {
        const access = await ensureRoomAccess(
          id,
          socket.data.userId,
          socket.data.role,
        );
        if (!access.ok) {
          socket.emit("room_error", { roomId: id, status: access.status });
          return;
        }
        socket.join(`room_${id}`);
      } catch {
        socket.emit("room_error", { roomId: id, status: 500 });
      }
    });

    socket.on(
      "send_message",
      async ({
        roomId: rawRoomId,
        content,
      }: {
        roomId: unknown;
        content: string;
      }) => {
        const roomId = parseRoomId(rawRoomId);
        if (!roomId) {
          socket.emit("message_error", {
            roomId: rawRoomId,
            message: "Invalid room",
          });
          return;
        }
        try {
          if (
            !content ||
            typeof content !== "string" ||
            content.trim().length === 0 ||
            content.length > 4000
          ) {
            socket.emit("message_error", {
              roomId,
              message: "Invalid content",
            });
            return;
          }

          const access = await ensureRoomAccess(
            roomId,
            socket.data.userId,
            socket.data.role,
          );
          if (!access.ok) {
            socket.emit("room_error", { roomId, status: access.status });
            return;
          }

          const message = await prisma.message.create({
            data: {
              content: content.trim(),
              userId: socket.data.userId,
              chatRoomId: roomId,
              isRead: false,
            },
            include: { user: { select: { name: true, role: true } } },
          });

          io.to(`room_${roomId}`).emit("new_message", { ...message, roomId });

          if (socket.data.role === "USER") {
            io.to("admins").emit("admin_notify", {
              roomId,
              userName: message.user.name,
            });
          } else {
            const room = await prisma.chatRoom.findUnique({
              where: { id: roomId },
              select: { userId: true },
            });
            if (room?.userId) {
              io.to(`user_${room.userId}`).emit("user_notify", { roomId });
            }
          }
        } catch {
          socket.emit("message_error", { roomId, message: "Failed to send" });
        }
      },
    );

    socket.on("mark_read", async ({ roomId: rawRoomId }: { roomId: unknown }) => {
      const roomId = parseRoomId(rawRoomId);
      if (!roomId) {
        socket.emit("room_error", { roomId: rawRoomId, status: 400 });
        return;
      }
      try {
        const access = await ensureRoomAccess(
          roomId,
          socket.data.userId,
          socket.data.role,
        );
        if (!access.ok) {
          socket.emit("room_error", { roomId, status: access.status });
          return;
        }

        await prisma.message.updateMany({
          where: {
            chatRoomId: roomId,
            isRead: false,
            user: { role: socket.data.role === "ADMIN" ? "USER" : "ADMIN" },
          },
          data: { isRead: true },
        });
        io.to(`room_${roomId}`).emit("messages_read", { roomId });
      } catch {
        socket.emit("room_error", { roomId, status: 500 });
      }
    });
  });
};
