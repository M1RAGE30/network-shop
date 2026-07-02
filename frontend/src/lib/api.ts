import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { clearAuthSession } from "./authSession";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ""}/api`,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = String(err.config?.url ?? "");
    const isAuthRequest = /\/auth\/(login|register|forgot|reset|verify|resend)/.test(
      url,
    );
    if (err.response?.status === 401 && !isAuthRequest) clearAuthSession();
    return Promise.reject(err);
  },
);

export default api;
