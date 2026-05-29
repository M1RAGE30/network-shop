import { create } from "zustand";

interface ChatState {
  unreadCount: number;
  setUnread: (n: number) => void;
  increment: () => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  unreadCount: 0,
  setUnread: (n) => set({ unreadCount: n }),
  increment: () => set({ unreadCount: get().unreadCount + 1 }),
  reset: () => set({ unreadCount: 0 }),
}));
