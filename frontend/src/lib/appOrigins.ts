import { redirectToAdminWithAuth } from "./adminAuth";
import { useAuthStore } from "../store/authStore";

export const SHOP_ORIGIN =
  import.meta.env.VITE_SHOP_URL?.replace(/\/$/, "") || "http://localhost:5173";

export const ADMIN_ORIGIN =
  import.meta.env.VITE_ADMIN_URL?.replace(/\/$/, "") || "http://localhost:5174";

export const SHOP_ADMIN_BRIDGE = `${SHOP_ORIGIN}/auth/admin-bridge`;

export const isAdminApp = import.meta.env.VITE_APP_TARGET === "admin";

export function openAdminPanel() {
  const { user, token } = useAuthStore.getState();
  if (user?.role === "ADMIN" && token) {
    redirectToAdminWithAuth(user, token);
    return;
  }
  window.location.href = SHOP_ADMIN_BRIDGE;
}
