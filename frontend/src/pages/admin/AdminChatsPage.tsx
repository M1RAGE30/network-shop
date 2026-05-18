import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { useChatStore } from "../../store/chatStore";
import { Send, MessageCircle, Trash2 } from "lucide-react";
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
    const socket = getSocket();
    const onAdminNotify = ({ roomId }: { roomId: number }) => {
      setLocalUnread((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] ?? 0) + 1,
      }));
    };
    socket.on("admin_notify", onAdminNotify);
    return () => {
      socket.off("admin_notify", onAdminNotify);
    };
  }, []);

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
    <div className="flex min-h-0 flex-1 gap-0 md:gap-3">
      <div
        className={`${showChat ? "hidden md:flex" : "flex"} ns-card-static w-full md:w-72 md:shrink-0 flex-col overflow-hidden border-r border-ns-border md:rounded-none`}
      >
        <div className="px-5 py-4 ns-table-head">
          <p className="text-sm font-semibold text-ns-text">
            {pluralizeDialogs(rooms.length)}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 && (
            <p className="text-sm text-ns-muted text-center mt-8 px-4">
              Нет диалогов
            </p>
          )}
          {rooms.map((room) => {
            const last = room.messages?.[0];
            const isActive = activeRoomId === room.id;
            return (
              <div
                key={room.id}
                onClick={() => handleOpenRoom(room.id)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group ${isActive ? "bg-white/48 dark:bg-white/12" : "ns-row-hover"}`}
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
                    <span className="bg-ns-accent text-ns-accent-fg text-xs min-w-[18px] h-[18px] flex items-center justify-center px-1.5 font-semibold rounded-full">
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
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-all text-red-600 dark:text-red-400"
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

      <div
        className={`${showChat ? "flex" : "hidden md:flex"} flex min-h-0 flex-1 flex-col overflow-hidden bg-ns-bg`}
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
            <div className="px-5 py-4 ns-table-head flex items-center gap-3">
              <button
                onClick={() => {
                  setShowChat(false);
                  setActiveRoomId(null);
                  navigate("/admin/chats", { replace: true });
                }}
                className="md:hidden p-2 rounded-full hover:bg-ns-hover transition-colors text-ns-text"
              >
                ←
              </button>
              <p className="text-sm font-semibold text-ns-text">
                {activeRoom.userName}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.map((msg) => {
                const isAdmin = msg.user.role === "ADMIN";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                  >
                    <span className="text-xs text-ns-muted px-2">
                      {isAdmin ? "🛡️ Вы" : msg.user.name}
                    </span>
                    <div
                      className={`px-5 py-3 text-sm break-words whitespace-pre-wrap rounded-3xl max-w-[75%] ${
                        isAdmin
                          ? "bg-ns-accent text-ns-accent-fg"
                          : "ns-chip text-ns-text"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-xs text-ns-muted px-2 mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString("ru-BY", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-4 ns-table-head flex gap-2">
              <input
                type="text"
                placeholder="Ответить..."
                className="flex-1 bg-ns-elevated border border-ns-border rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ns-accent text-ns-text placeholder:text-ns-muted  transition-all"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="aurora-button rounded-full w-12 h-12 flex items-center justify-center transition-transform hover:scale-[1.03] disabled:opacity-30 shrink-0"
              >
                <Send size={18} strokeWidth={1.5} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
