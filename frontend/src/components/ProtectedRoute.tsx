import { Navigate, Outlet } from "react-router-dom";
import { isAdminApp, SHOP_ADMIN_BRIDGE, SHOP_ORIGIN } from "../lib/appOrigins";
import { useAuthHydrated } from "../lib/useAuthHydrated";
import { useAuthStore } from "../store/authStore";

interface Props {
  adminOnly?: boolean;
  customerOnly?: boolean;
}

export default function ProtectedRoute({
  adminOnly = false,
  customerOnly = false,
}: Props) {
  const hydrated = useAuthHydrated();
  const { user } = useAuthStore();

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ns-bg">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-ns-border border-t-ns-accent"
          aria-hidden
        />
      </div>
    );
  }

  if (!user) {
    if (isAdminApp && adminOnly) {
      window.location.replace(SHOP_ADMIN_BRIDGE);
      return null;
    }
    return <Navigate to="/login" replace />;
  }
  if (adminOnly && user.role !== "ADMIN") {
    if (isAdminApp) {
      window.location.href = SHOP_ORIGIN;
      return null;
    }
    return <Navigate to="/" replace />;
  }
  if (customerOnly && user.role === "ADMIN" && isAdminApp) {
    return <Navigate to="/admin" replace />;
  }
  return <Outlet />;
}
