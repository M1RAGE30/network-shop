import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { useChatStore } from "../../store/chatStore";
import { Send, MessageCircle, Trash2, ArrowLeft } from "lucide-react";
import { pluralizeDialogs } from "../../lib/pluralize";

interface Message {
  id: number;
  content: string;
  createdAt: string;
  userId: number;
  user: { name: string; role: string };
}

interface RoomPreview {
  id: number;
  userName: string;
  userId: number | null;
  unreadCount: number;
  messages: Message[];
  user?: { name: string; id: number } | null;
}

export default function AdminChatsPage() {
  const qc = useQueryClient();
  const { setUnread } = useChatStore();
  const navigate = useNavigate();
  const { roomId: roomIdParam } = useParams<{ roomId?: string }>();
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [localUnread, setLocalUnread] = useState<Record<number, number>>({});
  const [showChat, setShowChat] = useState(false);
  const activeRoomRef = useRef<number | null>(null);
  const showChatRef = useRef(false);

  const { data: rooms = [] } = useQuery<RoomPreview[]>({
    queryKey: ["admin-chats"],
    queryFn: () => api.get("/admin/chats").then((r) => r.data),
    refetchInterval: 8000,
  });

  useEffect(() => {
    if (rooms.length === 0) return;
    setLocalUnread((prev) => {
      const next = { ...prev };
      rooms.forEach((r) => {
        if (r.unreadCount > 0 && (next[r.id] ?? 0) < r.unreadCount)
          next[r.id] = r.unreadCount;
      });
      return next;
    });
  }, [rooms]);

  const autoOpenDone = useRef(false);
  useEffect(() => {
    if (roomIdParam && rooms.length > 0 && !autoOpenDone.current) {
      autoOpenDone.current = true;
      openRoom(parseInt(roomIdParam));
      setShowChat(true);
    }
  }, [rooms.length, roomIdParam]);

  useEffect(() => {
    activeRoomRef.current = activeRoomId;
  }, [activeRoomId]);

  useEffect(() => {
    showChatRef.current = showChat;
  }, [showChat]);

  useEffect(() => {
    const socket = getSocket();
    const onAdminNotify = ({ roomId }: { roomId: number }) => {
      const isActiveRoomOpen =
        showChatRef.current && activeRoomRef.current === roomId;
      if (isActiveRoomOpen) {
        socket.emit("mark_read", { roomId });
        api
          .get("/admin/chats/unread")
          .then((r) => setUnread(r.data.count))
          .catch(() => {});
        qc.invalidateQueries({ queryKey: ["admin-chats"] });
        return;
      }
      setLocalUnread((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] ?? 0) + 1,
      }));
    };
    socket.on("admin_notify", onAdminNotify);
    return () => {
      socket.off("admin_notify", onAdminNotify);
    };
  }, [qc, setUnread]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/chats/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-chats"] });
      setActiveRoomId(null);
      setMessages([]);
    },
  });

  const openRoom = async (roomId: number) => {
    getSocket().off("new_message");
    navigate(`/admin/chats/${roomId}`, { replace: true });
    const { data } = await api.get(`/chat/room/${roomId}`);
    setActiveRoomId(data.id);
    setMessages(data.messages ?? []);
    setLocalUnread((prev) => {
      const next = { ...prev };
      delete next[roomId];
      return next;
    });
    const socket = getSocket();
    socket.emit("join_room", data.id);
    socket.emit("mark_read", { roomId: data.id });
    api
      .get("/admin/chats/unread")
      .then((r) => setUnread(r.data.count))
      .catch(() => {});
    qc.invalidateQueries({ queryKey: ["admin-chats"] });
    const onNewMessage = (msg: Message) => {
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
      socket.emit("mark_read", { roomId: data.id });
      api
        .get("/admin/chats/unread")
        .then((r) => setUnread(r.data.count))
        .catch(() => {});
      qc.invalidateQueries({ queryKey: ["admin-chats"] });
    };
    socket.on("new_message", onNewMessage);
  };

  const sendMessage = () => {
    if (!input.trim() || activeRoomId === null) return;
    getSocket().emit("send_message", {
      roomId: activeRoomId,
      content: input.trim(),
    });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const activeRoom = rooms.find((r) => r.id === activeRoomId);
  const handleOpenRoom = (roomId: number) => {
    openRoom(roomId);
    setShowChat(true);
  };

  return (
    <div className="flex min-h-0 flex-1 gap-3">
      <div
        className={`${showChat ? "hidden md:flex" : "flex"} ns-card-static w-full md:w-80 md:shrink-0 flex-col overflow-hidden rounded-2xl border border-ns-border`}
      >
        <div className="px-5 py-4 border-b border-ns-border">
          <p className="text-sm font-semibold text-ns-text">
            {pluralizeDialogs(rooms.length)}
          </p>
          <p className="text-xs text-ns-muted mt-1">Диалоги с покупателями</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 && (
            <div className="mx-4 mt-5 rounded-xl border border-dashed border-ns-border px-4 py-6 text-center">
              <p className="text-sm text-ns-text-secondary">Нет активных диалогов</p>
              <p className="text-xs text-ns-muted mt-1">Новые сообщения появятся здесь</p>
            </div>
          )}
          {rooms.map((room) => {
            const last = room.messages?.[0];
            const isActive = activeRoomId === room.id;
            return (
              <div
                key={room.id}
                onClick={() => handleOpenRoom(room.id)}
                className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors group border-b border-ns-border/70 ${isActive ? "bg-ns-hover" : "hover:bg-ns-hover/70"}`}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${isActive ? "text-ns-text" : "text-ns-text"}`}
                  >
                    {room.userName}
                  </p>
                  {last && (
                    <p
                      className={`text-xs truncate ${isActive ? "text-[#4b5b73] dark:text-[#a9bdd8]" : "text-ns-muted"}`}
                    >
                      {last.user.role === "ADMIN" ? "Вы: " : ""}
                      {last.content}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {last && (
                    <span
                      className={`text-xs ${isActive ? "text-[#4b5b73] dark:text-[#a9bdd8]" : "text-ns-muted"}`}
                    >
                      {new Date(last.createdAt).toLocaleTimeString("ru-BY", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                  {(localUnread[room.id] ?? 0) > 0 && !isActive ? (
                    <span className="inline-grid min-h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-ns-accent px-1 text-[10px] font-semibold leading-none tabular-nums text-ns-accent-fg">
                      {(localUnread[room.id] ?? 0) > 99
                        ? "99+"
                        : localUnread[room.id]}
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Удалить диалог с ${room.userName}?`))
                          deleteMutation.mutate(room.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 ns-action-icon ns-action-icon--danger transition-opacity"
                    >
                      <Trash2 size={12} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`${showChat ? "flex" : "hidden md:flex"} flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-ns-border bg-ns-bg-secondary`}>
        {!activeRoom ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <MessageCircle
              size={48}
              strokeWidth={1}
              className="text-ns-muted"
            />
            <p className="text-sm text-ns-muted">
              Выберите диалог
            </p>
          </div>
        ) : (
          <>
            <div className="px-5 py-4 border-b border-ns-border flex items-center gap-3">
              <button
                onClick={() => {
                  setShowChat(false);
                  setActiveRoomId(null);
                  navigate("/admin/chats", { replace: true });
                }}
                className="md:hidden ns-action-icon ns-action-icon--square text-ns-text shrink-0"
                aria-label="Назад к списку"
              >
                <ArrowLeft size={18} strokeWidth={1.75} />
              </button>
              <p className="text-sm font-semibold text-ns-text">
                {activeRoom.userName}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-3">
              {messages.map((msg) => {
                const isAdmin = msg.user.role === "ADMIN";
                return (
                  <div
                    key={msg.id}
                    className={`flex min-w-0 ${isAdmin ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex max-w-[85%] min-w-0 flex-col gap-1 ${isAdmin ? "items-end" : "items-start"}`}
                    >
                      <span className="text-xs text-ns-muted px-1">
                        {isAdmin ? "🛡️ Вы" : msg.user.name}
                      </span>
                      <div
                        className={`ns-chat-bubble px-4 py-2.5 text-sm ${
                          isAdmin
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
                className="ns-input ns-chat-input flex-1 min-w-0 text-sm"
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
          </>
        )}
      </div>
    </div>
  );
}
