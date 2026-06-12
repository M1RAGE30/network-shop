import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Store, ChevronUp } from "lucide-react";
import { SHOP_ORIGIN } from "../lib/appOrigins";
import { useThemeStore } from "../store/themeStore";
import ThemeToggleIcon, { themeToggleAriaLabel } from "./ThemeToggleIcon";
import { useBodyScrollLock } from "../lib/useBodyScrollLock";

export default function AdminMobileFab() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { dark, toggle } = useThemeStore();

  useBodyScrollLock(open, "ns-admin-fab-open");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (/^\/admin\/chats\/\d+/.test(pathname)) return null;

  const close = () => setOpen(false);

  return (
    <>
      {open && (
        <button
          type="button"
          className="ns-admin-fab__scrim lg:hidden"
          aria-label="Закрыть меню"
          onClick={close}
        />
      )}
      <div
        className={`ns-admin-fab lg:hidden${open ? " ns-admin-fab--open" : ""}`}
      >
        <div className="ns-admin-fab__actions" aria-hidden={!open}>
          <button
            type="button"
            onClick={toggle}
            className="ns-admin-fab__btn"
            aria-label={themeToggleAriaLabel(dark)}
            tabIndex={open ? 0 : -1}
          >
            <ThemeToggleIcon size={22} />
          </button>
          <a
            href={SHOP_ORIGIN}
            className="ns-admin-fab__btn"
            aria-label="В магазин"
            tabIndex={open ? 0 : -1}
          >
            <Store size={22} strokeWidth={1.5} />
          </a>
        </div>
        <button
          type="button"
          className="ns-admin-fab__toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Скрыть быстрые действия" : "Быстрые действия"}
        >
          <ChevronUp
            size={22}
            strokeWidth={2}
            className="ns-admin-fab__chevron"
            aria-hidden
          />
        </button>
      </div>
    </>
  );
}
