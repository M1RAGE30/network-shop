import { Link, useLocation } from "react-router-dom";

const LABELS: Record<string, string> = {
  catalog: "Каталог",
  cart: "Корзина",
  favorites: "Избранное",
  orders: "Заказы",
  profile: "Профиль",
  login: "Вход",
  register: "Регистрация",
  builder: "Конструкторы",
  network: "Конструктор сети",
  wifi: "Конструктор Wi-Fi",
  chat: "Чат",
  "new": "Оформление",
};

function toLabel(segment: string) {
  const normalized = decodeURIComponent(segment).toLowerCase();
  return LABELS[normalized] ?? decodeURIComponent(segment).replace(/-/g, " ");
}

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  return (
    <nav aria-label="Хлебные крошки" className="mb-4 sm:mb-5">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ns-muted">
        <li>
          <Link to="/" className="hover:text-ns-text transition-colors">
            Главная
          </Link>
        </li>
        {parts.map((part, index) => {
          const href = `/${parts.slice(0, index + 1).join("/")}`;
          const last = index === parts.length - 1;
          return (
            <li key={href} className="inline-flex items-center gap-1.5">
              <span aria-hidden>/</span>
              {last ? (
                <span className="text-ns-text">{toLabel(part)}</span>
              ) : (
                <Link to={href} className="hover:text-ns-text transition-colors">
                  {toLabel(part)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
