import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "./lib/prisma";
import { ensureRoomAccess } from "./services/chat-access.service";

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
    socket.on("join_room", async (roomId: number) => {
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
        socket.join(`room_${roomId}`);
      } catch {
        socket.emit("room_error", { roomId, status: 500 });
      }
    });

    socket.on(
      "send_message",
      async ({ roomId, content }: { roomId: number; content: string }) => {
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
            io.emit("admin_notify", { roomId, userName: message.user.name });
          } else {
            io.emit("user_notify", { roomId });
          }
        } catch {
          socket.emit("message_error", { roomId, message: "Failed to send" });
        }
      },
    );

    socket.on("mark_read", async ({ roomId }: { roomId: number }) => {
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
