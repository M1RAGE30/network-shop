import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import { getSocket } from "../lib/socket";
import api from "../lib/api";
import { isAdminApp } from "../lib/appOrigins";

export default function ChatButton() {
  const { user } = useAuthStore();
  const { unreadCount, setUnread, increment } = useChatStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = isAdminApp && user?.role === "ADMIN";
  const unreadEndpoint = isAdmin ? "/admin/chats/unread" : "/chat/unread";
  const chatPath = isAdmin ? "/admin/chats" : "/chat";
  const isOnChatPage = location.pathname.startsWith(chatPath);

  useEffect(() => {
    if (!user) return;
    api
      .get(unreadEndpoint)
      .then((r) => setUnread(r.data.count))
      .catch(() => {});
    const socket = getSocket();
    const notifyEvent = isAdmin ? "admin_notify" : "user_notify";
    const onNotify = () => increment();
    const onRead = () => {
      api
        .get(unreadEndpoint)
        .then((r) => setUnread(r.data.count))
        .catch(() => {});
    };
    socket.on(notifyEvent, onNotify);
    socket.on("messages_read", onRead);
    return () => {
      socket.off(notifyEvent, onNotify);
      socket.off("messages_read", onRead);
    };
  }, [user?.id]);

  useEffect(() => {
    if (user && isOnChatPage) setUnread(0);
  }, [location.pathname, user?.id]);

  if (!user || isOnChatPage || user.role === "ADMIN") return null;

  return (
    <button
      onClick={() => navigate(chatPath)}
      title={isAdmin ? "Чаты пользователей" : "Чат с консультантом"}
      className="fixed bottom-5 right-5 z-50 hidden md:flex h-14 w-14 items-center justify-center rounded-[20px] bg-ns-accent text-ns-accent-fg transition-transform hover:scale-[1.03] active:scale-[0.98] mb-[env(safe-area-inset-bottom)] mr-[env(safe-area-inset-right)] md:bottom-6 md:right-6"
    >
      <MessageCircle size={24} strokeWidth={1.5} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 ns-badge ns-badge--danger min-w-5 h-5 px-1">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
