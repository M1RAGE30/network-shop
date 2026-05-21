import { Routes, Route, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  MessageSquare,
  Moon,
  Sun,
  Store,
} from "lucide-react";
import { useThemeStore } from "../store/themeStore";
import { SHOP_ORIGIN } from "../lib/appOrigins";
import AdminStats from "./admin/AdminStats";
import AdminProductsPage from "./admin/AdminProductsPage";
import AdminOrdersPage from "./admin/AdminOrdersPage";
import AdminChatsPage from "./admin/AdminChatsPage";
import AdminUsersPage from "./admin/AdminUsersPage";
import AdminMobileFab from "../components/AdminMobileFab";

const NAV = [
  { to: "/admin", label: "Статистика", icon: LayoutDashboard, end: true },
  { to: "/admin/orders", label: "Заказы", icon: ShoppingBag },
  { to: "/admin/products", label: "Товары", icon: Package },
  { to: "/admin/users", label: "Пользователи", icon: Users },
  { to: "/admin/chats", label: "Чаты", icon: MessageSquare },
];

export default function AdminPage() {
  const location = useLocation();
  const { dark, toggle } = useThemeStore();
  const isChats = location.pathname.startsWith("/admin/chats");

  const isActive = (to: string, end?: boolean) =>
    end
      ? location.pathname === to
      : to === "/admin/chats"
        ? location.pathname.startsWith("/admin/chats")
        : location.pathname === to;

  return (
    <div className="ns-admin-shell flex min-h-dvh w-full">
      <aside className="ns-admin-shell__sidebar hidden lg:flex">
        <nav className="flex-1 space-y-1 overflow-y-auto p-3 pt-4 scrollbar-none">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <Link
              key={to}
              to={to}
              className={`flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(to, end)
                  ? "bg-ns-accent text-ns-accent-fg"
                  : "text-ns-text-secondary hover:bg-ns-hover hover:text-ns-text"
              }`}
            >
              <Icon size={18} strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="space-y-1 border-t border-ns-border p-3">
          <button
            type="button"
            onClick={toggle}
            className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm font-medium text-ns-text-secondary transition-colors hover:bg-ns-hover hover:text-ns-text"
          >
            {dark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
            {dark ? "Светлая тема" : "Тёмная тема"}
          </button>
          <a
            href={SHOP_ORIGIN}
            className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-ns-text-secondary transition-colors hover:bg-ns-hover hover:text-ns-text"
          >
            <Store size={18} strokeWidth={1.5} />
            В магазин
          </a>
        </div>
      </aside>

      <div className="ns-admin-shell__main overflow-x-hidden">
        <nav className="flex w-full gap-2 overflow-x-auto border-b border-ns-border px-2 py-2 scrollbar-none lg:hidden">
          {NAV.map(({ to, label, end }) => (
            <Link
              key={to}
              to={to}
              className={`shrink-0 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors ${
                isActive(to, end)
                  ? "bg-ns-accent text-ns-accent-fg"
                  : "bg-ns-elevated text-ns-text-secondary"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div
          className={`ns-admin-content w-full min-w-0 flex-1 max-lg:pb-24 p-3 sm:p-4 lg:p-8 ${
            isChats
              ? "flex min-h-0 flex-col overflow-hidden"
              : "overflow-auto"
          }`}
        >
          <Routes>
            <Route index element={<AdminStats />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="chats" element={<AdminChatsPage />} />
            <Route path="chats/:roomId" element={<AdminChatsPage />} />
          </Routes>
        </div>
        <AdminMobileFab />
      </div>
    </div>
  );
}
