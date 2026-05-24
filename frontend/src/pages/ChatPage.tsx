import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuthStore } from "../store/authStore";
import { ADMIN_ORIGIN } from "../lib/appOrigins";
import { useChatStore } from "../store/chatStore";
import { Send, ArrowLeft } from "lucide-react";
import { ChatPanelSkeleton } from "../components/skeleton/Skeleton";

interface Message {
  id: number;
  content: string;
  createdAt: string;
  userId: number;
  user: { name: string; role: string };
}

export default function ChatPage() {
  const { user } = useAuthStore();
  const { reset, setUnread } = useChatStore();
  const navigate = useNavigate();
  const { token: urlToken } = useParams<{ token?: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [roomId, setRoomId] = useState<number | null>(null);
  const socketInitialized = useRef(false);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      window.location.replace(`${ADMIN_ORIGIN}/admin/chats`);
    }
  }, [user]);

  const { data: room, isPending: roomLoading } = useQuery({
    queryKey: ["chat-room"],
    queryFn: () => api.get("/chat/room").then((r) => r.data),
    enabled: !!user && user.role !== "ADMIN",
    gcTime: 0,
  });

  useEffect(() => {
    if (!room) return;
    if (!urlToken) {
      navigate(`/chat/${room.token}`, { replace: true });
      return;
    }
    if (room.token !== urlToken) {
      navigate("/", { replace: true });
      return;
    }
    setRoomId(room.id);
    if (socketInitialized.current) return;
    socketInitialized.current = true;
    setMessages(room.messages ?? []);
    reset();
    const socket = getSocket();
    socket.emit("join_room", room.id);
    socket.emit("mark_read", { roomId: room.id });
    const onNewMessage = (msg: Message) => {
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
      if (msg.user.role === "ADMIN")
        socket.emit("mark_read", { roomId: room.id });
    };
    const onMessagesRead = () => {
      api
        .get("/chat/unread")
        .then((r) => setUnread(r.data.count))
        .catch(() => {});
    };
    socket.on("new_message", onNewMessage);
    socket.on("messages_read", onMessagesRead);
    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("messages_read", onMessagesRead);
      socketInitialized.current = false;
    };
  }, [room?.id, urlToken, navigate, reset, setUnread]);

  const sendMessage = () => {
    if (!input.trim() || !roomId) return;
    getSocket().emit("send_message", { roomId, content: input.trim() });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="ns-action-icon text-ns-text shrink-0"
          aria-label="Назад"
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </button>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-ns-text tracking-tight">
          Чат с поддержкой
        </h1>
      </div>
      {roomLoading ? (
        <ChatPanelSkeleton />
      ) : (
      <div
        className="aurora-card flex flex-col overflow-hidden border border-ns-border"
        style={{
          height: "min(560px, calc(100dvh - 12rem))",
          minHeight: "min(500px, calc(100dvh - 10rem))",
        }}
      >
        <div className="px-5 py-4 border-b border-ns-border flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-[var(--radius-btn)] bg-ns-success shrink-0"
            aria-hidden
          />
          <p className="text-sm font-semibold text-ns-text">
            Поддержка NetworkShop
          </p>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-6 space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-sm text-ns-muted mt-12">
              Напишите нам — мы ответим в ближайшее время
            </p>
          )}
          {messages.map((msg) => {
            const isOwn = msg.userId === user.id;
            const isAdmin = msg.user.role === "ADMIN";
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex max-w-[85%] min-w-0 flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}
                >
                  <span className="text-xs text-ns-muted px-1">
                    {isOwn ? "Вы" : isAdmin ? "Консультант" : msg.user.name}
                  </span>
                  <div
                    className={`ns-chat-bubble px-4 py-2.5 text-sm ${
                      isOwn
                        ? "bg-ns-accent text-ns-accent-fg"
                        : "ns-chip text-ns-text"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-xs text-ns-muted px-1">
                    {new Date(msg.createdAt).toLocaleTimeString("ru-BY", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-4 border-t border-ns-border flex items-center gap-2">
          <input
            type="text"
            placeholder="Ответить..."
            className="ns-input ns-chat-input flex-1 min-w-[min(100%,12rem)] text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim()}
            className="aurora-button ns-chat-send disabled:opacity-40"
            aria-label="Отправить"
          >
            <Send strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
