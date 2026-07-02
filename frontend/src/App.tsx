import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
const HomePage = lazy(() => import("./pages/HomePage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const CatalogPage = lazy(() => import("./pages/CatalogPage"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const AdminBridgePage = lazy(() => import("./pages/AdminBridgePage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const NetworkBuilderPage = lazy(
  () => import("./pages/builder/NetworkBuilderPage"),
);
const WifiBuilderPage = lazy(() => import("./pages/builder/WifiBuilderPage"));

import { RouteFallback } from "./components/RouteFallback";

const PageLoader = () => <RouteFallback />;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route
          index
          element={
            <Suspense fallback={<PageLoader />}>
              <HomePage />
            </Suspense>
          }
        />
        <Route
          path="catalog"
          element={
            <Suspense fallback={<PageLoader />}>
              <CatalogPage />
            </Suspense>
          }
        />
        <Route
          path="catalog/:slug"
          element={
            <Suspense fallback={<PageLoader />}>
              <ProductPage />
            </Suspense>
          }
        />
        <Route
          path="login"
          element={
            <Suspense fallback={<PageLoader />}>
              <LoginPage />
            </Suspense>
          }
        />
        <Route
          path="auth/admin-bridge"
          element={
            <Suspense fallback={<PageLoader />}>
              <AdminBridgePage />
            </Suspense>
          }
        />
        <Route
          path="register"
          element={
            <Suspense fallback={<PageLoader />}>
              <RegisterPage />
            </Suspense>
          }
        />
        <Route
          path="verify-email"
          element={
            <Suspense fallback={<PageLoader />}>
              <VerifyEmailPage />
            </Suspense>
          }
        />
        <Route
          path="forgot-password"
          element={
            <Suspense fallback={<PageLoader />}>
              <ForgotPasswordPage />
            </Suspense>
          }
        />
        <Route
          path="reset-password"
          element={
            <Suspense fallback={<PageLoader />}>
              <ResetPasswordPage />
            </Suspense>
          }
        />
        <Route element={<ProtectedRoute />}>
          <Route
            path="builder/network"
            element={
              <Suspense fallback={<PageLoader />}>
                <NetworkBuilderPage />
              </Suspense>
            }
          />
          <Route
            path="builder/wifi"
            element={
              <Suspense fallback={<PageLoader />}>
                <WifiBuilderPage />
              </Suspense>
            }
          />
          <Route
            path="profile"
            element={
              <Suspense fallback={<PageLoader />}>
                <ProfilePage />
              </Suspense>
            }
          />
          <Route
            path="chat"
            element={
              <Suspense fallback={<PageLoader />}>
                <ChatPage />
              </Suspense>
            }
          />
          <Route
            path="chat/:token"
            element={
              <Suspense fallback={<PageLoader />}>
                <ChatPage />
              </Suspense>
            }
          />
        </Route>
        <Route element={<ProtectedRoute customerOnly />}>
          <Route
            path="favorites"
            element={
              <Suspense fallback={<PageLoader />}>
                <FavoritesPage />
              </Suspense>
            }
          />
          <Route
            path="cart"
            element={
              <Suspense fallback={<PageLoader />}>
                <CartPage />
              </Suspense>
            }
          />
          <Route
            path="orders"
            element={
              <Suspense fallback={<PageLoader />}>
                <OrdersPage />
              </Suspense>
            }
          />
          <Route
            path="orders/new"
            element={
              <Suspense fallback={<PageLoader />}>
                <CheckoutPage />
              </Suspense>
            }
          />
        </Route>
        <Route
          path="*"
          element={
            <Suspense fallback={<PageLoader />}>
              <NotFoundPage />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
