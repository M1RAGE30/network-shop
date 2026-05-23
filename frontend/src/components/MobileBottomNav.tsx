import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Wrench, ShoppingCart, User, ChevronDown } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { isAdmin } from "../lib/roles";
import { AdminBlockedNav } from "./AdminBlockedNav";
import BuilderNavMenu from "./BuilderNavMenu";

const items = [
  { to: "/", icon: Home, label: "Главная", match: (p: string) => p === "/" },
  {
    to: "/catalog",
    icon: LayoutGrid,
    label: "Каталог",
    match: (p: string) => p.startsWith("/catalog"),
  },
  {
    key: "builders",
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
    match: (p: string) => p === "/profile",
  },
] as const;

export default function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuthStore();
  const totalCount = useCartStore((s) => s.totalCount());
  const admin = isAdmin(user);
  const [buildersOpen, setBuildersOpen] = useState(false);
  const [buildersVisible, setBuildersVisible] = useState(false);
  const buildersRef = useRef<HTMLDivElement>(null);

  const navItems = items.map((item) =>
    "to" in item && item.to === "/profile" && !user ? { ...item, to: "/login" } : item,
  );

  useEffect(() => {
    setBuildersOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (buildersOpen) {
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setBuildersVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setBuildersVisible(false);
  }, [buildersOpen]);

  useEffect(() => {
    if (!buildersOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (buildersRef.current && !buildersRef.current.contains(e.target as Node)) {
        setBuildersOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [buildersOpen]);

  const closeBuilders = () => setBuildersOpen(false);

  return (
    <nav
      className="ns-bottom-nav fixed bottom-0 inset-x-0 z-50 md:hidden pb-[env(safe-area-inset-bottom)]"
      aria-label="Нижняя навигация"
    >
      {buildersOpen && (
        <button
          type="button"
          className={`ns-bottom-nav__backdrop ${
            buildersVisible ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Закрыть меню конструкторов"
          onClick={closeBuilders}
        />
      )}

      <div className="ns-bottom-nav__bar relative z-50 flex h-[76px] items-stretch justify-around px-1">
        {navItems.map((item) => {
          if ("key" in item && item.key === "builders") {
            const active = item.match(location.pathname);
            return (
              <div
                key="builders"
                ref={buildersRef}
                className="relative flex min-w-0 flex-1 flex-col items-center justify-center"
              >
                {buildersOpen && (
                  <div
                    className={`ns-dropdown-up ns-card-static absolute bottom-full left-1/2 z-50 mb-3 min-w-[min(88vw,15rem)] -translate-x-1/2 p-2 ${
                      buildersVisible ? "ns-dropdown-up--open" : ""
                    }`}
                  >
                    <BuilderNavMenu
                      onNavigate={() => {
                        closeBuilders();
                      }}
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setBuildersOpen((v) => !v)}
                  className={`relative flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-[14px] px-1 transition-all duration-200 ns-touch-target ${
                    active || buildersOpen ? "text-ns-text" : "text-ns-muted active:scale-95"
                  }`}
                  aria-expanded={buildersOpen}
                  aria-haspopup="menu"
                >
                  <span className="relative flex h-[22px] items-center justify-center">
                    <Wrench size={22} strokeWidth={active || buildersOpen ? 2 : 1.5} />
                  </span>
                  <span className="relative inline-flex flex-col items-center">
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold leading-tight text-center">
                      {item.label}
                      <ChevronDown
                        size={10}
                        strokeWidth={2}
                        className={`shrink-0 transition-transform duration-200 ${
                          buildersOpen ? "rotate-180" : ""
                        }`}
                      />
                    </span>
                    {(active || buildersOpen) && (
                      <span
                        className="mt-1 h-1 w-1 shrink-0 rounded-full bg-ns-text"
                        aria-hidden
                      />
                    )}
                  </span>
                </button>
              </div>
            );
          }

          const linkItem = item as {
            to: string;
            icon: typeof Home;
            label: string;
            match: (p: string) => boolean;
          };
          const { to, icon: Icon, label, match } = linkItem;
          const active = match(location.pathname);
          const showBadge = to === "/cart" && totalCount > 0 && !admin;
          const blocked = admin && "customerOnly" in item && item.customerOnly;

          const itemClass = `relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[14px] px-1 transition-all duration-200 ns-touch-target ${
            active && !blocked ? "text-ns-text" : "text-ns-muted active:scale-95"
          }`;

          const itemInner = (
            <>
              <span className="relative flex h-[22px] items-center justify-center">
                <Icon size={22} strokeWidth={active && !blocked ? 2 : 1.5} />
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
                {active && !blocked && (
                  <span
                    className="mt-1 h-1 w-1 shrink-0 rounded-full bg-ns-text"
                    aria-hidden
                  />
                )}
              </span>
            </>
          );

          if (blocked) {
            return (
              <AdminBlockedNav key={to} className={itemClass} as="div">
                {itemInner}
              </AdminBlockedNav>
            );
          }

          return (
            <Link
              key={to}
              to={to}
              onClick={() => setBuildersOpen(false)}
              className={itemClass}
            >
              {itemInner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
