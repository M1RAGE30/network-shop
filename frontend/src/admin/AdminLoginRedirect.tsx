import { useEffect } from "react";
import { SHOP_ADMIN_BRIDGE } from "../lib/appOrigins";
import { useAuthHydrated } from "../lib/useAuthHydrated";
import { useAuthStore } from "../store/authStore";
import { redirectToAdminWithAuth } from "../lib/adminAuth";

export default function AdminLoginRedirect() {
  const hydrated = useAuthHydrated();
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (!hydrated) return;

    if (user?.role === "ADMIN" && token) {
      redirectToAdminWithAuth(user, token);
      return;
    }

    window.location.replace(SHOP_ADMIN_BRIDGE);
  }, [hydrated, user, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ns-bg">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-ns-border border-t-ns-accent"
        aria-hidden
      />
    </div>
  );
}
