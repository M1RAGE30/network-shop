import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/authStore";

let socket: Socket | null = null;
let socketToken: string | null = null;

const getSocketUrl = () => {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
};

export const getSocket = (): Socket => {
  const token = useAuthStore.getState().token;
  if (socket && socketToken !== token) {
    disconnectSocket();
  }
  if (!socket) {
    socketToken = token;
    socket = io(getSocketUrl(), {
      auth: { token },
      autoConnect: true,
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketToken = null;
  }
};
