import { create } from "zustand";

interface CartItem {
  productId: number;
  quantity: number;
  product: { id: number; name: string; price: number; imageUrl: string | null };
}

interface CartState {
  items: CartItem[];
  setItems: (items: CartItem[]) => void;
  totalCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  setItems: (items) => set({ items }),
  totalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
