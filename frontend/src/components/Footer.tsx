import { Link } from "react-router-dom";
import { isAdmin } from "../lib/roles";
import { useAuthStore } from "../store/authStore";
import { AdminBlockedNav } from "./AdminBlockedNav";

export default function Footer() {
  const { user } = useAuthStore();
  const admin = isAdmin(user);

  const linkClass =
    "text-[15px] text-ns-text-secondary hover:text-ns-text transition-colors duration-200 cursor-pointer";

  const footerLink = (to: string, label: string, blocked = false) =>
    blocked ? (
      <AdminBlockedNav className={linkClass} as="span">
        {label}
      </AdminBlockedNav>
    ) : (
      <Link to={to} className={linkClass}>
        {label}
      </Link>
    );

  const contactClass = `${linkClass} ns-footer-contact`;

  return (
    <footer className="ns-site-footer hidden md:block">
      <div className="ns-container ns-site-footer__inner">
        <div className="ns-footer-grid">
          <div>
            <h3 className="text-sm font-semibold text-ns-text mb-4">Магазин</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/catalog" className={linkClass}>
                  Каталог
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=routers" className={linkClass}>
                  Маршрутизаторы
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=switches" className={linkClass}>
                  Коммутаторы
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=access-points" className={linkClass}>
                  Точки доступа
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ns-text mb-4">Аккаунт</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/profile" className={linkClass}>
                  Профиль
                </Link>
              </li>
              <li>{footerLink("/orders", "Заказы", admin)}</li>
              <li>{footerLink("/favorites", "Избранное", admin)}</li>
              <li>{footerLink("/cart", "Корзина", admin)}</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ns-text mb-4">Конструкторы</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/builder/network" className={linkClass}>
                  Конструктор сети
                </Link>
              </li>
              <li>
                <Link to="/builder/wifi" className={linkClass}>
                  Конструктор Wi‑Fi
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ns-text mb-4">Поддержка</h3>
            <ul className="space-y-3">
              {!admin && (
                <li>
                  <Link to="/chat" className={linkClass}>
                    Чат поддержки
                  </Link>
                </li>
              )}
              <li>
                <a href="tel:+375291234567" className={contactClass}>
                  +375 (29) 123-45-67
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@networkshop.by"
                  className={`${contactClass} ns-footer-contact--email`}
                >
                  support@networkshop.by
                </a>
              </li>
            </ul>
          </div>
        </div>

        <hr className="ns-separator ns-site-footer__separator" />
        <p className="ns-site-footer__copy text-sm text-ns-muted text-center">
          © {new Date().getFullYear()} NetworkShop. Сетевое оборудование для дома и бизнеса.
        </p>
      </div>
    </footer>
  );
}
