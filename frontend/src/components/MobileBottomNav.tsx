import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Wrench, ShoppingCart, User } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { isAdmin } from "../lib/roles";

const items = [
  { to: "/", icon: Home, label: "Главная", match: (p: string) => p === "/" },
  {
    to: "/catalog",
    icon: LayoutGrid,
    label: "Каталог",
    match: (p: string) => p.startsWith("/catalog"),
  },
  {
    to: "/builder/network",
    icon: Wrench,
    label: "Конструкторы",
    match: (p: string) => p.startsWith("/builder"),
  },
  {
    to: "/cart",
    icon: ShoppingCart,
    label: "Корзина",
    customerOnly: true,
    match: (p: string) => p.startsWith("/cart"),
  },
  {
    to: "/profile",
    icon: User,
    label: "Профиль",
    authOnly: true,
    match: (p: string) => p === "/profile" || p === "/login",
  },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuthStore();
  const totalCount = useCartStore((s) => s.totalCount());
  const admin = isAdmin(user);

  const navItems = items
    .filter((item) => {
      if (item.customerOnly && (!user || admin)) return false;
      if (item.authOnly && !user) return { ...item, to: "/login" };
      return true;
    })
    .map((item) =>
      item.to === "/profile" && !user ? { ...item, to: "/login" } : item,
    );

  return (
    <nav
      className="ns-bottom-nav fixed bottom-0 inset-x-0 z-50 md:hidden pb-[env(safe-area-inset-bottom)]"
      aria-label="Нижняя навигация"
    >
      <div className="flex h-[76px] items-stretch justify-around px-1">
        {navItems.map(({ to, icon: Icon, label, match }) => {
          const active = match(location.pathname);
          const showBadge = to === "/cart" && totalCount > 0;
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[14px] px-1 transition-all duration-200 ns-touch-target ${
                active ? "text-ns-text" : "text-ns-muted active:scale-95"
              }`}
            >
              <span className="relative flex h-[22px] items-center justify-center">
                <Icon size={22} strokeWidth={active ? 2 : 1.5} />
                {showBadge && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-ns-accent px-1 text-[10px] font-semibold text-ns-accent-fg">
                    {totalCount > 9 ? "9+" : totalCount}
                  </span>
                )}
              </span>
              <span className="relative inline-flex flex-col items-center">
                <span className="text-[10px] font-semibold leading-tight text-center">
                  {label}
                </span>
                {active && (
                  <span
                    className="mt-1 h-1 w-1 shrink-0 rounded-full bg-ns-text"
                    aria-hidden
                  />
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
