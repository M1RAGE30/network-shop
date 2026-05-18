export function getPageTitle(pathname: string): string | null {
  if (pathname === "/") return null;
  if (pathname.startsWith("/catalog/")) return "Товар";
  if (pathname === "/catalog") return "Каталог";
  if (pathname.startsWith("/builder/network")) return "Конструктор сети";
  if (pathname.startsWith("/builder/wifi")) return "Wi‑Fi покрытие";
  if (pathname === "/cart") return "Корзина";
  if (pathname === "/favorites") return "Избранное";
  if (pathname === "/orders") return "Заказы";
  if (pathname.startsWith("/orders/new")) return "Оформление";
  if (pathname === "/profile") return "Профиль";
  if (pathname.startsWith("/chat")) return "Поддержка";
  if (pathname.startsWith("/admin")) return "Админ";
  if (pathname === "/login") return "Вход";
  if (pathname === "/register") return "Регистрация";
  return null;
}
