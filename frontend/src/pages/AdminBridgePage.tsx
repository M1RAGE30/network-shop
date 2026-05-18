import { useEffect } from "react";
import { SHOP_ORIGIN } from "../lib/appOrigins";
import { redirectToAdminWithAuth } from "../lib/adminAuth";
import { useAuthStore } from "../store/authStore";
import { useAuthHydrated } from "../lib/useAuthHydrated";

export default function AdminBridgePage() {
  const hydrated = useAuthHydrated();
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (!hydrated) return;

    if (user?.role === "ADMIN" && token) {
      redirectToAdminWithAuth(user, token);
      return;
    }

    window.location.replace(`${SHOP_ORIGIN}/login?return=admin`);
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
