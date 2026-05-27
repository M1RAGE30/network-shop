import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
  LayoutGrid,
  MessageCircle,
  Settings,
} from "lucide-react";
import { openAdminPanel } from "../lib/appOrigins";
import { useAuthStore } from "../store/authStore";
import { isAdmin } from "../lib/roles";
import { AdminBlockedNav } from "./AdminBlockedNav";
import { useCartStore } from "../store/cartStore";
import { useThemeStore } from "../store/themeStore";
import { useBodyScrollLock } from "../lib/useBodyScrollLock";
import Logo from "./Logo";
import BuilderNavMenu from "./BuilderNavMenu";
import ThemeToggleIcon, { themeToggleAriaLabel } from "./ThemeToggleIcon";

export default function Navbar() {
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const totalCount = useCartStore((s) => s.totalCount());
  const { dark, toggle } = useThemeStore();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const builderRef = useRef<HTMLDivElement>(null);
  const [phoneLayout, setPhoneLayout] = useState(false);

  const isHome = location.pathname === "/";
  const isActive = (path: string) => location.pathname.startsWith(path);
  useBodyScrollLock(menuOpen, "ns-overlay-open");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setPhoneLayout(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

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

  useEffect(() => {
    if (menuOpen) {
      setMenuMounted(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setMenuVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setMenuVisible(false);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const onMenuTransitionEnd = () => {
    if (!menuOpen) setMenuMounted(false);
  };

  const navSurface =
    isHome && !scrolled ? "ns-nav--home" : "ns-nav--scrolled";

  const navLinkClass = (active: boolean) =>
    `ns-nav-link text-[15px] font-medium text-ns-text ${active ? "ns-nav-link--active" : ""}`;

  const iconBtn =
    "ns-icon-btn ns-touch-target relative flex items-center justify-center rounded-[var(--radius-btn)]";

  const builderDropdown = (
    <div className="ns-dropdown ns-card-static absolute top-full left-1/2 z-50 mt-3 min-w-[240px] -translate-x-1/2 p-2">
      <BuilderNavMenu onNavigate={() => setBuilderOpen(false)} />
    </div>
  );

  const menuLink = (to: string, label: string, Icon: LucideIcon, blocked = false) => {
    const cls =
      "flex items-center gap-3 rounded-[14px] px-4 py-3.5 text-base font-medium text-ns-text hover:bg-ns-hover transition-colors";
    const content = (
      <>
        <Icon size={20} className="text-ns-muted shrink-0" strokeWidth={1.5} />
        {label}
      </>
    );
    if (blocked) {
      return (
        <AdminBlockedNav className={cls} as="div">
          {content}
        </AdminBlockedNav>
      );
    }
    return (
      <Link to={to} onClick={closeMenu} className={cls}>
        {content}
      </Link>
    );
  };

  const iconLink = (
    to: string,
    label: string,
    icon: ReactNode,
    badge?: React.ReactNode,
    blocked = false,
  ) => {
    const cls = iconBtn;
    const inner = (
      <>
        {icon}
        {badge}
      </>
    );
    if (blocked) {
      return (
        <AdminBlockedNav className={cls} aria-label={label}>
          {inner}
        </AdminBlockedNav>
      );
    }
    return (
      <Link to={to} className={cls} aria-label={label}>
        {inner}
      </Link>
    );
  };

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
            <span className="text-lg font-semibold text-ns-text tracking-tight">
              NetworkShop
            </span>
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
            <button
              type="button"
              onClick={toggle}
              className={iconBtn}
              aria-label={themeToggleAriaLabel(dark)}
            >
              <ThemeToggleIcon size={24} />
            </button>
            {user && (
              <>
                {iconLink(
                  "/favorites",
                  "Избранное",
                  <Heart size={24} strokeWidth={1.5} />,
                  undefined,
                  admin,
                )}
                {iconLink(
                  "/cart",
                  "Корзина",
                  <ShoppingCart size={24} strokeWidth={1.5} />,
                  admin ? undefined : cartBadge,
                  admin,
                )}
                {iconLink(
                  "/orders",
                  "Заказы",
                  <ShoppingBag size={24} strokeWidth={1.5} />,
                  undefined,
                  admin,
                )}
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
            <span className="font-semibold text-ns-text text-base tracking-tight">
              NetworkShop
            </span>
          </Link>
          <button type="button" onClick={() => setMenuOpen(true)} className={iconBtn} aria-label="Меню">
            <Menu size={24} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <header
        className={`ns-mobile-nav sticky top-0 z-[90] flex md:hidden items-center justify-between gap-2 px-4 sm:px-5 ${navSurface}`}
      >
        <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0">
          <Logo size={28} />
          <span className="font-semibold text-ns-text text-base tracking-tight truncate hidden min-[375px]:inline">
            NetworkShop
          </span>
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <button
            type="button"
            onClick={toggle}
            className={iconBtn}
            aria-label={themeToggleAriaLabel(dark)}
          >
            <ThemeToggleIcon size={22} />
          </button>
          {user && (
            <>
              {iconLink(
                "/favorites",
                "Избранное",
                <Heart size={22} strokeWidth={1.5} />,
                undefined,
                admin,
              )}
              {iconLink(
                "/orders",
                "Заказы",
                <ShoppingBag size={22} strokeWidth={1.5} />,
                undefined,
                admin,
              )}
            </>
          )}
          {!admin &&
            iconLink(
              "/chat",
              "Поддержка",
              <MessageCircle size={22} strokeWidth={1.5} />,
            )}
          {user?.role === "ADMIN" && (
            <button
              type="button"
              onClick={() => openAdminPanel()}
              className={iconBtn}
              aria-label="Админ-панель"
            >
              <Settings size={22} strokeWidth={1.5} />
            </button>
          )}
          {!user && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Link
                to="/login"
                className="ns-btn ns-btn-ghost text-xs py-1.5 px-2 sm:px-2.5 whitespace-nowrap"
              >
                Вход
              </Link>
              <Link
                to="/register"
                className="ns-btn ns-btn-primary text-xs py-1.5 px-2 sm:px-2.5 whitespace-nowrap"
              >
                Регистрация
              </Link>
            </div>
          )}
        </div>
      </header>

      {menuMounted && (
        <>
          <button
            type="button"
            className={`ns-overlay-backdrop fixed inset-0 z-[95] bg-black/60 transition-opacity duration-300 lg:hidden ${
              menuVisible ? "opacity-100" : "opacity-0"
            }`}
            aria-label="Закрыть меню"
            onClick={closeMenu}
          />
          <aside
            onTransitionEnd={onMenuTransitionEnd}
            className={`ns-overlay-panel ns-menu-panel fixed inset-y-0 right-0 z-[96] flex w-[min(88vw,20rem)] flex-col border-l border-ns-border bg-ns-bg md:max-w-[22rem] ${
              menuVisible ? "ns-menu-panel--open" : ""
            }`}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-ns-border">
              <span className="font-semibold text-ns-text">Меню</span>
              <button type="button" onClick={closeMenu} className={iconBtn} aria-label="Закрыть">
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-1">
              {!phoneLayout && (
                <>
                  {menuLink("/catalog", "Каталог", LayoutGrid)}
                  {menuLink("/builder/network", "Конструктор сети", Network)}
                  {menuLink("/builder/wifi", "Конструктор Wi‑Fi", Wifi)}
                  {user && (
                    <>
                      {menuLink("/favorites", "Избранное", Heart, admin)}
                      {menuLink("/cart", "Корзина", ShoppingCart, admin)}
                      {menuLink("/orders", "Заказы", ShoppingBag, admin)}
                    </>
                  )}
                  {user && menuLink("/profile", "Профиль", User)}
                  {!admin && menuLink("/chat", "Поддержка", MessageCircle)}
                  {user?.role === "ADMIN" && (
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        openAdminPanel();
                      }}
                      className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3.5 text-left text-base font-medium text-ns-text transition-colors hover:bg-ns-hover"
                    >
                      <Settings
                        size={20}
                        className="shrink-0 text-ns-muted"
                        strokeWidth={1.5}
                      />
                      Админ-панель
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggle()}
                    className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3.5 text-left text-base font-medium text-ns-text hover:bg-ns-hover"
                    aria-label={themeToggleAriaLabel(dark)}
                  >
                    <ThemeToggleIcon size={20} className="text-ns-muted" />
                    {dark ? "Светлая тема" : "Тёмная тема"}
                  </button>
                </>
              )}
            </nav>
            {!user && !phoneLayout && (
              <div className="shrink-0 space-y-2 border-t border-ns-border px-3 py-4">
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="ns-btn ns-btn-secondary w-full"
                >
                  Вход
                </Link>
                <Link
                  to="/register"
                  onClick={closeMenu}
                  className="ns-btn ns-btn-primary w-full"
                >
                  Регистрация
                </Link>
              </div>
            )}
          </aside>
        </>
      )}
    </>
  );
}
