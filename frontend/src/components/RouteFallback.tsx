import { useLocation } from "react-router-dom";
import {
  AdminChatsPageSkeleton,
  AdminOrdersPageSkeleton,
  AdminProductsPageSkeleton,
  AdminShellSkeleton,
  AdminStatsSkeleton,
  AdminUsersPageSkeleton,
  AuthPageSkeleton,
  NetworkBuilderPageSkeleton,
  WifiBuilderPageSkeleton,
  CartPageSkeleton,
  CatalogPageSkeleton,
  ChatPageSkeleton,
  CheckoutPageSkeleton,
  FavoritesPageSkeleton,
  HomePageSkeleton,
  OrdersPageSkeleton,
  ProductPageSkeleton,
  ProfilePageSkeleton,
  Skeleton,
} from "./skeleton/Skeleton";

export function RouteFallback() {
  const { pathname } = useLocation();

  if (pathname === "/" || pathname === "") {
    return <HomePageSkeleton />;
  }

  if (pathname === "/catalog") {
    return <CatalogPageSkeleton />;
  }

  if (pathname.startsWith("/catalog/")) {
    return <ProductPageSkeleton />;
  }

  if (pathname === "/login") {
    return <AuthPageSkeleton variant="login" />;
  }

  if (pathname === "/register") {
    return <AuthPageSkeleton variant="register" />;
  }

  if (pathname === "/verify-email") {
    return <AuthPageSkeleton variant="verify" />;
  }

  if (pathname === "/forgot-password") {
    return <AuthPageSkeleton variant="forgot" />;
  }

  if (pathname === "/reset-password") {
    return <AuthPageSkeleton variant="reset" />;
  }

  if (pathname === "/auth/admin-bridge") {
    return <AuthPageSkeleton variant="bridge" />;
  }

  if (pathname.startsWith("/builder/wifi")) {
    return <WifiBuilderPageSkeleton />;
  }

  if (pathname.startsWith("/builder/network")) {
    return <NetworkBuilderPageSkeleton />;
  }

  if (pathname === "/favorites") {
    return <FavoritesPageSkeleton />;
  }

  if (pathname === "/cart") {
    return <CartPageSkeleton />;
  }

  if (pathname === "/orders/new") {
    return <CheckoutPageSkeleton />;
  }

  if (pathname === "/orders") {
    return <OrdersPageSkeleton />;
  }

  if (pathname === "/profile") {
    return <ProfilePageSkeleton />;
  }

  if (pathname === "/chat" || pathname.startsWith("/chat/")) {
    return <ChatPageSkeleton />;
  }

  return (
    <div className="ns-page-empty py-16" aria-busy="true">
      <Skeleton className="h-10 w-56 mx-auto mb-4" />
      <Skeleton className="h-4 w-72 max-w-full mx-auto" />
    </div>
  );
}

export function AdminRouteFallback() {
  const { pathname } = useLocation();
  const isChats = pathname.startsWith("/admin/chats");
  const isOrders = pathname.startsWith("/admin/orders");
  const isFullHeightView = isChats || isOrders;
  let content;

  if (isOrders) {
    content = <AdminOrdersPageSkeleton />;
  } else if (pathname.startsWith("/admin/products")) {
    content = <AdminProductsPageSkeleton />;
  } else if (pathname.startsWith("/admin/users")) {
    content = <AdminUsersPageSkeleton />;
  } else if (isChats) {
    content = <AdminChatsPageSkeleton />;
  } else {
    content = <AdminStatsSkeleton />;
  }

  return (
    <AdminShellSkeleton isChats={isChats} isFullHeightView={isFullHeightView}>
      {content}
    </AdminShellSkeleton>
  );
}
