import { useNavigate, useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { isAdminApp } from "../lib/appOrigins";
import { useChatUnread } from "../lib/useChatUnread";

export default function ChatButton() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = isAdminApp && user?.role === "ADMIN";
  const chatPath = isAdmin ? "/admin/chats" : "/chat";
  const isOnChatPage = location.pathname.startsWith(chatPath);
  const unreadCount = useChatUnread(isAdmin, !!user && !isOnChatPage);

  if (!user || isOnChatPage || user.role === "ADMIN") return null;

  return (
    <button
      type="button"
      onClick={() => navigate(chatPath)}
      title={isAdmin ? "Чаты пользователей" : "Чат с консультантом"}
      aria-label={
        unreadCount > 0
          ? `${isAdmin ? "Чаты пользователей" : "Чат с консультантом"}, непрочитанных: ${unreadCount}`
          : isAdmin
            ? "Чаты пользователей"
            : "Чат с консультантом"
      }
      className="ns-chat-fab fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center bg-ns-accent text-ns-accent-fg shadow-sm transition-colors hover:bg-ns-accent-hover mb-[env(safe-area-inset-bottom)] mr-[env(safe-area-inset-right)] md:bottom-6 md:right-6"
    >
      <MessageCircle size={24} strokeWidth={1.5} aria-hidden />
      {unreadCount > 0 && (
        <span className="ns-unread-badge absolute -top-0.5 -right-0.5" aria-hidden>
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
