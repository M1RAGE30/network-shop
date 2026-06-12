import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SHOP_ADMIN_BRIDGE } from "../lib/appOrigins";
import { useAuthStore } from "../store/authStore";
import { establishAuthSession } from "../lib/authSession";

export default function AdminAuthCallback() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const raw = window.location.hash.slice(1);
    if (!raw) {
      const { user, token } = useAuthStore.getState();
      if (user?.role === "ADMIN" && token) {
        navigate("/admin", { replace: true });
        return;
      }
      window.location.replace(SHOP_ADMIN_BRIDGE);
      return;
    }
    try {
      const { user, token } = JSON.parse(decodeURIComponent(escape(atob(raw))));
      if (user && token) {
        establishAuthSession();
        setAuth(user, token);
      }
    } catch {}
    navigate("/admin", { replace: true });
  }, [navigate, setAuth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ns-bg">
      <div
        className="h-8 w-8 rounded-full border-2 border-ns-border border-t-ns-accent animate-spin"
        aria-hidden
      />
    </div>
  );
}
