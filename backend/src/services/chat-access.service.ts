import prisma from "../lib/prisma";

export const ensureRoomAccess = async (
  roomId: number,
  userId: number,
  userRole: string,
) => {
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { id: true, userId: true },
  });

  if (!room) return { ok: false as const, status: 404 as const };
  if (userRole === "ADMIN" || room.userId === userId) {
    return { ok: true as const, room };
  }

  return { ok: false as const, status: 403 as const };
};
