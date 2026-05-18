import type { User } from "../store/authStore";
import { ADMIN_ORIGIN } from "./appOrigins";

export function encodeAdminAuthPayload(user: User, token: string) {
  return btoa(
    unescape(encodeURIComponent(JSON.stringify({ user, token }))),
  );
}

export function redirectToAdminWithAuth(user: User, token: string) {
  const payload = encodeAdminAuthPayload(user, token);
  window.location.replace(`${ADMIN_ORIGIN}/admin/auth-callback#${payload}`);
}
