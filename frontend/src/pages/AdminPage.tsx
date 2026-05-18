import { useQuery } from "@tanstack/react-query";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  MessageSquare,
  BarChart3,
  Moon,
  Sun,
  Store,
} from "lucide-react";
import api from "../lib/api";
import { formatPrice } from "../lib/format";
import { useThemeStore } from "../store/themeStore";
import { SHOP_ORIGIN } from "../lib/appOrigins";
import AdminProductsPage from "./admin/AdminProductsPage";
import AdminOrdersPage from "./admin/AdminOrdersPage";
import AdminChatsPage from "./admin/AdminChatsPage";
import AdminUsersPage from "./admin/AdminUsersPage";

const NAV = [
  { to: "/admin", label: "Статистика", icon: LayoutDashboard, end: true },
  { to: "/admin/orders", label: "Заказы", icon: ShoppingBag },
  { to: "/admin/products", label: "Товары", icon: Package },
  { to: "/admin/users", label: "Пользователи", icon: Users },
  { to: "/admin/chats", label: "Чаты", icon: MessageSquare },
];

function AdminStats() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.get("/admin/stats").then((r) => r.data),
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Заказов", value: data?.totalOrders },
          { label: "Пользователей", value: data?.totalUsers },
          { label: "Товаров", value: data?.totalProducts },
          {
            label: "Выручка",
            value: data?.revenue ? formatPrice(data.revenue) : "0,00 BYN",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="ns-card-static ns-admin-metric ns-card-padding min-w-0"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ns-text/45">
              {s.label}
            </p>
            <p className="break-words text-2xl font-bold text-ns-text sm:text-3xl">
              {s.value ?? "—"}
            </p>
          </div>
        ))}
      </div>
      <div className="ns-card-static flex items-center gap-4 p-8 text-ns-text-secondary">
        <BarChart3 size={32} className="shrink-0 text-ns-muted" strokeWidth={1.5} />
        <p className="text-sm">
          Графики продаж и роста пользователей — раздел для подключения аналитики.
        </p>
      </div>
    </div>
  );
}

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
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors ${
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
            className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm font-medium text-ns-text-secondary transition-colors hover:bg-ns-hover hover:text-ns-text"
          >
            {dark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
            {dark ? "Светлая тема" : "Тёмная тема"}
          </button>
          <a
            href={SHOP_ORIGIN}
            className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-ns-text-secondary transition-colors hover:bg-ns-hover hover:text-ns-text"
          >
            <Store size={18} strokeWidth={1.5} />
            В магазин
          </a>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-end gap-2 border-b border-ns-border bg-ns-bg-secondary px-4 py-3 lg:hidden">
          <button type="button" onClick={toggle} className="ns-icon-btn" aria-label="Тема">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <a href={SHOP_ORIGIN} className="ns-icon-btn" aria-label="В магазин">
            <Store size={18} strokeWidth={1.5} />
          </a>
        </div>

        <nav className="flex gap-2 overflow-x-auto border-b border-ns-border px-3 py-2 scrollbar-none lg:hidden">
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
          className={
            isChats
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "flex-1 overflow-auto p-4 sm:p-6 lg:p-8"
          }
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
      </div>
    </div>
  );
}
