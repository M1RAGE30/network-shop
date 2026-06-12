import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminAuthCallback from "./AdminAuthCallback";
import AdminLoginRedirect from "./AdminLoginRedirect";
import AdminStandaloneLayout from "./AdminStandaloneLayout";

const AdminPage = lazy(() => import("../pages/AdminPage"));

import { AdminRouteFallback } from "../components/RouteFallback";

const PageLoader = () => <AdminRouteFallback />;

export default function AdminApp() {
  return (
    <Routes>
      <Route path="/admin/auth-callback" element={<AdminAuthCallback />} />
      <Route path="/login" element={<AdminLoginRedirect />} />
      <Route element={<ProtectedRoute adminOnly />}>
        <Route element={<AdminStandaloneLayout />}>
          <Route
            path="/admin/*"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminPage />
              </Suspense>
            }
          />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
