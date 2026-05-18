import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Heart,
  User,
  ShoppingBag,
  ChevronDown,
  Network,
  Wifi,
  ShoppingCart,
  Menu,
  X,
  Sun,
  Moon,
  LayoutGrid,
  MessageCircle,
  LogIn,
  Settings,
} from "lucide-react";
import { openAdminPanel } from "../lib/appOrigins";
import { useAuthStore } from "../store/authStore";
import { isAdmin } from "../lib/roles";
import { useCartStore } from "../store/cartStore";
import { useThemeStore } from "../store/themeStore";
import { getPageTitle } from "../lib/pageTitles";
import { useBodyScrollLock } from "../lib/useBodyScrollLock";
import Logo from "./Logo";

export default function Navbar() {
  const { user } = useAuthStore();
  const totalCount = useCartStore((s) => s.totalCount());
  const { dark, toggle } = useThemeStore();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const builderRef = useRef<HTMLDivElement>(null);

  const isHome = location.pathname === "/";
  const isActive = (path: string) => location.pathname.startsWith(path);
  const pageTitle = getPageTitle(location.pathname);

  useBodyScrollLock(menuOpen, "ns-overlay-open");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (builderRef.current && !builderRef.current.contains(e.target as Node)) {
        setBuilderOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    setBuilderOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  const navSurface =
    isHome && !scrolled ? "ns-nav--home" : "ns-nav--scrolled";

  const navLinkClass = (active: boolean) =>
    `ns-nav-link text-[15px] font-medium text-ns-text ${active ? "ns-nav-link--active" : ""}`;

  const iconBtn =
    "ns-icon-btn ns-touch-target relative flex items-center justify-center rounded-[14px]";

  const builderDropdown = (
    <div className="ns-dropdown ns-card-static absolute top-full left-1/2 z-50 mt-3 min-w-[240px] -translate-x-1/2 p-2">
      <Link
        to="/builder/network"
        onClick={() => setBuilderOpen(false)}
        className="flex gap-3 rounded-[14px] px-3 py-3 hover:bg-ns-hover transition-colors"
      >
        <Network size={20} className="text-ns-muted shrink-0 mt-0.5" strokeWidth={1.5} />
        <span>
          <span className="block text-sm font-medium text-ns-text">Конструктор сети</span>
          <span className="block text-xs text-ns-muted">Топология и подбор оборудования</span>
        </span>
      </Link>
      <Link
        to="/builder/wifi"
        onClick={() => setBuilderOpen(false)}
        className="flex gap-3 rounded-[14px] px-3 py-3 hover:bg-ns-hover transition-colors"
      >
        <Wifi size={20} className="text-ns-muted shrink-0 mt-0.5" strokeWidth={1.5} />
        <span>
          <span className="block text-sm font-medium text-ns-text">Конструктор Wi‑Fi</span>
          <span className="block text-xs text-ns-muted">Тепловая карта покрытия</span>
        </span>
      </Link>
    </div>
  );

  const menuLink = (to: string, label: string, Icon: LucideIcon) => (
    <Link
      to={to}
      onClick={() => setMenuOpen(false)}
      className="flex items-center gap-3 rounded-[14px] px-4 py-3.5 text-base font-medium text-ns-text hover:bg-ns-hover transition-colors"
    >
      <Icon size={20} className="text-ns-muted shrink-0" strokeWidth={1.5} />
      {label}
    </Link>
  );

  const cartBadge =
    totalCount > 0 ? (
      <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ns-accent px-1 text-[10px] font-semibold text-ns-accent-fg">
        {totalCount > 9 ? "9+" : totalCount}
      </span>
    ) : null;

  return (
    <>
      <header
        className={`ns-nav ns-nav-desktop sticky top-0 z-40 hidden lg:block ${navSurface}`}
      >
        <div className="ns-container h-full flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <Logo size={40} />
            <span className="text-base font-semibold text-ns-text">NetworkShop</span>
          </Link>

          <nav className="flex items-center gap-6" aria-label="Основное меню">
            <Link to="/catalog" className={navLinkClass(isActive("/catalog"))}>
              Каталог
            </Link>
            <div className="relative flex items-center" ref={builderRef}>
              <button
                type="button"
                onClick={() => setBuilderOpen((v) => !v)}
                className={`inline-flex items-center gap-1 ${navLinkClass(isActive("/builder"))}`}
              >
                <span>Конструкторы</span>
                <ChevronDown
                  size={16}
                  strokeWidth={1.5}
                  className={`shrink-0 transition-transform duration-200 ${builderOpen ? "rotate-180" : ""}`}
                />
              </button>
              {builderOpen && builderDropdown}
            </div>
          </nav>

          <div className="flex items-center gap-6 shrink-0">
            <button type="button" onClick={toggle} className={iconBtn} aria-label="Тема">
              {dark ? <Sun size={24} strokeWidth={1.5} /> : <Moon size={24} strokeWidth={1.5} />}
            </button>
            {user && !isAdmin(user) && (
              <>
                <Link to="/favorites" className={iconBtn} aria-label="Избранное">
                  <Heart size={24} strokeWidth={1.5} />
                </Link>
                <Link to="/cart" className={iconBtn} aria-label="Корзина">
                  <ShoppingCart size={24} strokeWidth={1.5} />
                  {cartBadge}
                </Link>
                <Link to="/orders" className={iconBtn} aria-label="Заказы">
                  <ShoppingBag size={24} strokeWidth={1.5} />
                </Link>
              </>
            )}
            {user ? (
              <>
                <Link to="/profile" className={iconBtn} aria-label="Профиль">
                  <User size={24} strokeWidth={1.5} />
                </Link>
                {user.role === "ADMIN" && (
                  <button
                    type="button"
                    onClick={() => openAdminPanel()}
                    className={iconBtn}
                    aria-label="Админ-панель"
                    title="Админ-панель"
                  >
                    <Settings size={24} strokeWidth={1.5} />
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="ns-btn ns-btn-ghost text-sm py-2 px-4">
                  Вход
                </Link>
                <Link to="/register" className="ns-btn ns-btn-primary text-sm py-2 px-4">
                  Регистрация
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <header
        className={`ns-nav ns-nav-desktop sticky top-0 z-40 hidden md:flex lg:hidden ${navSurface}`}
      >
        <div className="ns-container h-full flex items-center justify-between gap-4 w-full">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Logo size={28} />
            <span className="font-semibold text-ns-text text-sm">NetworkShop</span>
          </Link>
          <div className="flex items-center gap-2">
            {user && !isAdmin(user) && (
              <Link to="/cart" className={iconBtn} aria-label="Корзина">
                <ShoppingCart size={24} strokeWidth={1.5} />
                {cartBadge}
              </Link>
            )}
            <Link to={user ? "/profile" : "/login"} className={iconBtn} aria-label="Профиль">
              <User size={24} strokeWidth={1.5} />
            </Link>
            <button type="button" onClick={() => setMenuOpen(true)} className={iconBtn} aria-label="Меню">
              <Menu size={24} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      <header
        className={`ns-mobile-nav sticky top-0 z-[90] flex md:hidden items-center justify-between gap-2 px-5 ${navSurface}`}
      >
        <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0">
          <Logo size={28} />
          <span className="font-semibold text-ns-text text-sm truncate hidden min-[375px]:inline">
            NetworkShop
          </span>
        </Link>
        {pageTitle ? (
          <p className="flex-1 text-center text-sm font-medium text-ns-text-secondary truncate px-2">
            {pageTitle}
          </p>
        ) : (
          <div className="flex-1" />
        )}
        <button type="button" onClick={() => setMenuOpen(true)} className={iconBtn} aria-label="Меню">
          <Menu size={24} strokeWidth={1.5} />
        </button>
      </header>

      {menuOpen && (
        <>
          <button
            type="button"
            className="ns-overlay-backdrop fixed inset-0 bg-black/60 lg:hidden"
            aria-label="Закрыть меню"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="ns-overlay-panel ns-menu-panel ns-menu-panel--open fixed inset-y-0 left-0 flex w-[min(88vw,20rem)] flex-col border-r border-ns-border bg-ns-bg-secondary shadow-[4px_0_24px_rgba(0,0,0,0.12)] md:max-w-[22rem]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ns-border">
              <span className="font-semibold text-ns-text">Меню</span>
              <button type="button" onClick={() => setMenuOpen(false)} className={iconBtn} aria-label="Закрыть">
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-1">
              {menuLink("/catalog", "Каталог", LayoutGrid)}
              {menuLink("/builder/network", "Конструктор сети", Network)}
              {menuLink("/builder/wifi", "Конструктор Wi‑Fi", Wifi)}
              {user && !isAdmin(user) && (
                <>
                  {menuLink("/favorites", "Избранное", Heart)}
                  {menuLink("/cart", "Корзина", ShoppingCart)}
                  {menuLink("/orders", "Заказы", ShoppingBag)}
                </>
              )}
              {menuLink("/chat", "Поддержка", MessageCircle)}
              {user ? menuLink("/profile", "Профиль", User) : menuLink("/login", "Вход", LogIn)}
              {user?.role === "ADMIN" && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    openAdminPanel();
                  }}
                  className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3.5 text-left text-base font-medium text-ns-text transition-colors hover:bg-ns-hover"
                >
                  <Settings size={20} className="shrink-0 text-ns-muted" strokeWidth={1.5} />
                  Админ-панель
                </button>
              )}
              <button
                type="button"
                onClick={() => toggle()}
                className="w-full rounded-[14px] px-4 py-3.5 text-left text-base font-medium text-ns-text hover:bg-ns-hover flex items-center gap-3"
              >
                {dark ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
                {dark ? "Светлая тема" : "Тёмная тема"}
              </button>
              {!user && (
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="ns-btn ns-btn-primary w-full mt-4"
                >
                  Регистрация
                </Link>
              )}
            </nav>
          </aside>
        </>
      )}
    </>
  );
}
