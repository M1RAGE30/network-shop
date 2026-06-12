import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import { getSocket } from "./socket";
import api from "./api";

function chatUnreadQueryKey(userId: number | undefined, isAdmin: boolean) {
  return ["chat-unread", userId, isAdmin] as const;
}

export function useChatUnread(isAdmin: boolean, enabled = true) {
  const { user } = useAuthStore();
  const { setUnread } = useChatStore();
  const qc = useQueryClient();
  const adminChatsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endpoint = isAdmin ? "/admin/chats/unread" : "/chat/unread";
  const notifyEvent = isAdmin ? "admin_notify" : "user_notify";

  const { data } = useQuery({
    queryKey: chatUnreadQueryKey(user?.id, isAdmin),
    queryFn: () => api.get(endpoint).then((r) => r.data.count as number),
    enabled: enabled && !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (data !== undefined) setUnread(data);
  }, [data, setUnread]);

  useEffect(() => {
    if (!user || !enabled) return;

    const scheduleAdminChatsRefresh = () => {
      if (!isAdmin) return;
      if (adminChatsTimerRef.current) clearTimeout(adminChatsTimerRef.current);
      adminChatsTimerRef.current = setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["admin-chats"] });
      }, 120);
    };

    const refetch = () => {
      qc.invalidateQueries({
        queryKey: chatUnreadQueryKey(user.id, isAdmin),
      });
      scheduleAdminChatsRefresh();
    };

    getSocket();
    const socket = getSocket();
    socket.on(notifyEvent, refetch);
    socket.on("messages_read", refetch);
    return () => {
      socket.off(notifyEvent, refetch);
      socket.off("messages_read", refetch);
      if (adminChatsTimerRef.current) {
        clearTimeout(adminChatsTimerRef.current);
      }
    };
  }, [user?.id, isAdmin, enabled, notifyEvent, qc]);

  return useChatStore((s) => s.unreadCount);
}
