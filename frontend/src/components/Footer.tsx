import { Link } from "react-router-dom";
import { isAdmin } from "../lib/roles";
import { useAuthStore } from "../store/authStore";
export default function Footer() {
  const { user } = useAuthStore();
  const showCustomerLinks = !user || !isAdmin(user);

  const linkClass =
    "text-[15px] text-ns-text-secondary hover:text-ns-text transition-colors duration-200";

  return (
    <footer className="ns-site-footer">
      <div className="ns-container pt-20 pb-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
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
              {showCustomerLinks && (
                <>
                  <li>
                    <Link to="/orders" className={linkClass}>
                      Заказы
                    </Link>
                  </li>
                  <li>
                    <Link to="/favorites" className={linkClass}>
                      Избранное
                    </Link>
                  </li>
                  <li>
                    <Link to="/cart" className={linkClass}>
                      Корзина
                    </Link>
                  </li>
                </>
              )}
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
              <li>
                <Link to="/chat" className={linkClass}>
                  Чат поддержки
                </Link>
              </li>
              <li>
                <a href="tel:+375291234567" className={linkClass}>
                  +375 (29) 123-45-67
                </a>
              </li>
              <li>
                <a href="mailto:support@networkshop.by" className={linkClass}>
                  support@networkshop.by
                </a>
              </li>
            </ul>
          </div>
        </div>

        <hr className="ns-separator my-10" />
        <p className="text-sm text-ns-muted text-center">
          © {new Date().getFullYear()} NetworkShop. Сетевое оборудование для дома и бизнеса.
        </p>
      </div>
    </footer>
  );
}
