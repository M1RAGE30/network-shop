import { useLocation } from "react-router-dom";
import { Moon, Sun, Store } from "lucide-react";
import { SHOP_ORIGIN } from "../lib/appOrigins";
import { useThemeStore } from "../store/themeStore";

export default function AdminMobileFab() {
  const { pathname } = useLocation();
  const { dark, toggle } = useThemeStore();

  if (/^\/admin\/chats\/\d+/.test(pathname)) return null;

  return (
    <div
      className="ns-admin-fab lg:hidden"
      aria-label="Быстрые действия админки"
    >
      <button
        type="button"
        onClick={toggle}
        className="ns-admin-fab__btn"
        aria-label={dark ? "Светлая тема" : "Тёмная тема"}
      >
        {dark ? <Sun size={22} strokeWidth={1.5} /> : <Moon size={22} strokeWidth={1.5} />}
      </button>
      <a href={SHOP_ORIGIN} className="ns-admin-fab__btn" aria-label="В магазин">
        <Store size={22} strokeWidth={1.5} />
      </a>
    </div>
  );
}
