import { useAuthStore } from "../store/authStore";
import { queryClient } from "./queryClient";
import { disconnectSocket } from "./socket";

export function clearAuthSession() {
  disconnectSocket();
  queryClient.clear();
  useAuthStore.getState().logout();
}

export function establishAuthSession() {
  disconnectSocket();
}
