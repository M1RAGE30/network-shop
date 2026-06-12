import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { Send, MessageCircle, Trash2, ArrowLeft } from "lucide-react";
import { pluralizeDialogs } from "../../lib/pluralize";
import { AdminChatListSkeleton } from "../../components/skeleton/Skeleton";
import { useChatScroll } from "../../lib/useChatScroll";

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
  const navigate = useNavigate();
  const { roomId: roomIdParam } = useParams<{ roomId?: string }>();
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const activeRoomRef = useRef<number | null>(null);
  const showChatRef = useRef(false);
  const newMessageHandlerRef = useRef<((msg: Message) => void) | null>(null);
  const pendingSendRef = useRef("");
  const [sendError, setSendError] = useState("");
  const { scrollRef, afterOwnMessage } = useChatScroll(
    messages.length,
    activeRoomId,
  );
  const afterOwnMessageRef = useRef(afterOwnMessage);
  afterOwnMessageRef.current = afterOwnMessage;

  const { data: rooms = [], isPending: roomsLoading } = useQuery<RoomPreview[]>({
    queryKey: ["admin-chats"],
    queryFn: () => api.get("/admin/chats").then((r) => r.data),
    staleTime: 0,
    refetchOnMount: "always",
  });

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
    const onMessagesRead = ({ roomId }: { roomId: number }) => {
      qc.setQueryData<RoomPreview[]>(["admin-chats"], (prev) => {
        if (!prev) return prev;
        return prev.map((room) =>
          room.id === roomId ? { ...room, unreadCount: 0 } : room,
        );
      });
    };
    socket.on("messages_read", onMessagesRead);
    return () => {
      socket.off("messages_read", onMessagesRead);
    };
  }, [qc]);

  useEffect(() => {
    const socket = getSocket();
    const onAdminNotify = ({ roomId }: { roomId: number }) => {
      const isActiveRoomOpen =
        showChatRef.current && activeRoomRef.current === roomId;
      if (isActiveRoomOpen) {
        socket.emit("mark_read", { roomId });
        return;
      }
      qc.setQueryData<RoomPreview[]>(["admin-chats"], (prev) => {
        if (!prev) return prev;
        return prev.map((room) =>
          room.id === roomId
            ? { ...room, unreadCount: room.unreadCount + 1 }
            : room,
        );
      });
    };
    socket.on("admin_notify", onAdminNotify);
    return () => {
      socket.off("admin_notify", onAdminNotify);
    };
  }, [qc]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/chats/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-chats"] });
      setActiveRoomId(null);
      setMessages([]);
    },
  });

  useEffect(() => {
    const socket = getSocket();
    const onMessageError = ({ message }: { message?: string }) => {
      if (pendingSendRef.current) {
        setInput(pendingSendRef.current);
        pendingSendRef.current = "";
      }
      setSendError(message ?? "Не удалось отправить сообщение");
    };
    socket.on("message_error", onMessageError);
    return () => {
      socket.off("message_error", onMessageError);
    };
  }, []);

  useEffect(() => {
    return () => {
      const socket = getSocket();
      if (newMessageHandlerRef.current) {
        socket.off("new_message", newMessageHandlerRef.current);
      }
    };
  }, []);

  const openRoom = async (roomId: number) => {
    const socket = getSocket();
    if (newMessageHandlerRef.current) {
      socket.off("new_message", newMessageHandlerRef.current);
      newMessageHandlerRef.current = null;
    }
    setSendError("");
    navigate(`/admin/chats/${roomId}`, { replace: true });
    const { data } = await api.get(`/chat/room/${roomId}`);
    setActiveRoomId(data.id);
    setMessages(data.messages ?? []);
    qc.setQueryData<RoomPreview[]>(["admin-chats"], (prev) => {
      if (!prev) return prev;
      return prev.map((room) =>
        room.id === data.id ? { ...room, unreadCount: 0 } : room,
      );
    });
    socket.emit("join_room", data.id);
    socket.emit("mark_read", { roomId: data.id });
    qc.invalidateQueries({ queryKey: ["admin-chats"] });
    const onNewMessage = (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        if (msg.user.role === "ADMIN") {
          queueMicrotask(() => afterOwnMessageRef.current());
        }
        return [...prev, msg];
      });
      socket.emit("mark_read", { roomId: data.id });
      qc.invalidateQueries({ queryKey: ["admin-chats"] });
    };
    newMessageHandlerRef.current = onNewMessage;
    socket.on("new_message", onNewMessage);
  };

  const sendMessage = () => {
    if (!input.trim() || activeRoomId === null) return;
    const content = input.trim();
    pendingSendRef.current = content;
    setInput("");
    setSendError("");
    getSocket().emit("send_message", {
      roomId: activeRoomId,
      content,
    });
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
    <div className="flex h-full min-h-0 flex-1 items-stretch gap-3 overflow-hidden">
      <div
        className={`${showChat ? "hidden md:flex" : "flex"} ns-card-static h-full min-h-0 w-full md:w-80 md:shrink-0 flex-col overflow-hidden rounded-2xl border border-ns-border`}
      >
        <div className="px-5 py-4 border-b border-ns-border">
          <p className="text-sm font-semibold text-ns-text">
            {pluralizeDialogs(rooms.length)}
          </p>
          <p className="text-xs text-ns-muted mt-1">Диалоги с покупателями</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {roomsLoading && rooms.length === 0 ? (
            <div className="p-3">
              <AdminChatListSkeleton rows={5} />
            </div>
          ) : rooms.length === 0 ? (
            <div className="m-4 rounded-xl border border-dashed border-ns-border px-4 py-6 text-center">
              <p className="text-sm text-ns-text-secondary">Нет активных диалогов</p>
              <p className="text-xs text-ns-muted mt-1">Новые сообщения появятся здесь</p>
            </div>
          ) : (
          rooms.map((room) => {
            const last = room.messages?.[0];
            const isActive = activeRoomId === room.id;
            const roomUnread = isActive ? 0 : room.unreadCount;
            return (
              <button
                type="button"
                key={room.id}
                onClick={() => handleOpenRoom(room.id)}
                className={`flex w-full items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors group border-b border-ns-border/70 text-left ${
                  isActive
                    ? "bg-ns-hover border-l-[3px] border-l-ns-accent pl-[calc(1.25rem-3px)]"
                    : "hover:bg-ns-hover/70 border-l-[3px] border-l-transparent"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${isActive ? "text-ns-text" : "text-ns-text"}`}
                  >
                    {room.userName}
                  </p>
                  {last && (
                    <p
                      className={`text-xs truncate ${isActive ? "text-ns-text-secondary" : "text-ns-muted"}`}
                    >
                      {last.user.role === "ADMIN" ? "Вы: " : ""}
                      {last.content}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {last && (
                    <span
                      className={`text-xs ${isActive ? "text-ns-text-secondary" : "text-ns-muted"}`}
                    >
                      {new Date(last.createdAt).toLocaleTimeString("ru-BY", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                  {roomUnread > 0 ? (
                    <span className="ns-unread-badge ns-unread-badge--admin">
                      {roomUnread > 99 ? "99+" : roomUnread}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Удалить диалог с ${room.userName}?`))
                          deleteMutation.mutate(room.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 ns-action-icon ns-action-icon--danger transition-opacity"
                      aria-label={`Удалить диалог с ${room.userName}`}
                    >
                      <Trash2 size={12} strokeWidth={1.5} aria-hidden />
                    </button>
                  )}
                </div>
              </button>
            );
          })
          )}
        </div>
      </div>

      <div
        className={`${showChat ? "flex" : "hidden md:flex"} ns-card-static h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-ns-border`}
      >
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
                  qc.invalidateQueries({ queryKey: ["admin-chats"] });
                }}
                className="md:hidden ns-action-icon ns-action-icon--square shrink-0 text-ns-text"
                aria-label="Назад к списку"
              >
                <ArrowLeft size={18} strokeWidth={1.75} />
              </button>
              <p className="text-sm font-semibold text-ns-text">
                {activeRoom.userName}
              </p>
            </div>

            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-3"
            >
              {messages.map((msg) => {
                const isAdmin = msg.user.role === "ADMIN";
                return (
                  <div
                    key={msg.id}
                    className={`flex min-w-0 ${isAdmin ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex w-fit max-w-[85%] min-w-0 flex-col gap-1 ${isAdmin ? "items-end" : "items-start"}`}
                    >
                      <span className="text-xs text-ns-muted px-1 whitespace-nowrap">
                        {isAdmin ? "Вы" : msg.user.name}
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

            <div className="px-4 py-4 border-t border-ns-border flex flex-col gap-2">
              {sendError && (
                <p className="text-sm text-ns-error px-1" role="alert">
                  {sendError}
                </p>
              )}
              <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Введите сообщение..."
                className="ns-input ns-chat-input flex-1 min-w-0 text-sm"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim()}
                className="aurora-button ns-chat-send disabled:opacity-55"
                aria-label="Отправить"
              >
                <Send strokeWidth={2} aria-hidden />
              </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
