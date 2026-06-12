import { create } from "zustand";

interface ChatState {
  unreadCount: number;
  setUnread: (n: number) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  unreadCount: 0,
  setUnread: (n) => set({ unreadCount: n }),
  reset: () => set({ unreadCount: 0 }),
}));
