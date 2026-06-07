const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Ожидает",
  CONFIRMED: "Подтверждён",
  SHIPPED: "Отправлен",
  DELIVERED: "Доставлен",
  CANCELLED: "Отменён",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(value: unknown): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function formatDateTime(value: Date | string): string {
  return new Date(value).toLocaleString("ru-BY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function table(
  headers: string[],
  rows: (string | number)[][],
): string {
  const head = headers
    .map((h) => `<th>${escapeHtml(h)}</th>`)
    .join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function section(title: string, content: string): string {
  return `<h2>${escapeHtml(title)}</h2>${content}`;
}

function kvTable(rows: [string, string | number][]): string {
  return table(
    ["Показатель", "Значение"],
    rows.map(([k, v]) => [k, v]),
  );
}

export type AdminStatsExportPayload = {
  date: string;
  summary: {
    ordersDay: number;
    revenueDay: number;
    newUsersDay: number;
    reviewsDay: number;
    messagesDay: number;
    ordersByStatusDay: Record<string, number>;
    totalOrders: number;
    totalUsers: number;
    totalProducts: number;
    revenueAll: number;
    pendingOrders: number;
    unreadChats: number;
    ordersByStatusAll: Record<string, number>;
  };
  orders: Array<{
    id: number;
    createdAt: Date;
    status: string;
    totalAmount: unknown;
    address: string;
    phone: string | null;
    comment: string | null;
    user: { name: string; email: string } | null;
    items: Array<{
      quantity: number;
      price: unknown;
      product: { name: string } | null;
    }>;
  }>;
  newUsers: Array<{
    id: number;
    name: string;
    email: string;
    role: string;
    isEmailVerified: boolean;
    createdAt: Date;
  }>;
  reviews: Array<{
    id: number;
    rating: number;
    comment: string | null;
    createdAt: Date;
    user: { name: string; email: string };
    product: { name: string };
  }>;
  messages: Array<{
    id: number;
    createdAt: Date;
    isRead: boolean;
    content: string;
    user: { name: string; role: string };
    chatRoomId: number;
  }>;
  productsByCategory: Array<{
    categoryName: string;
    count: number;
  }>;
  lowStock: Array<{
    id: number;
    name: string;
    stock: number;
    price: unknown;
    category: { name: string } | null;
    brand: { name: string } | null;
  }>;
  topSold: Array<{
    productName: string;
    quantity: number;
    revenue: number;
  }>;
};

export function buildAdminStatsExcelHtml(payload: AdminStatsExportPayload): string {
  const { date, summary, orders } = payload;
  const statusOrder = [
    "PENDING",
    "CONFIRMED",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ];

  const statusDayRows = statusOrder.map((status) => [
    ORDER_STATUS_LABELS[status] ?? status,
    summary.ordersByStatusDay[status] ?? 0,
  ]);

  const statusAllRows = statusOrder.map((status) => [
    ORDER_STATUS_LABELS[status] ?? status,
    summary.ordersByStatusAll[status] ?? 0,
  ]);

  const orderRows = orders.map((order) => {
    const itemsCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
    const itemsSummary = order.items
      .map(
        (i) =>
          `${i.product?.name ?? "—"} × ${i.quantity} (${formatMoney(i.price)} б.р.)`,
      )
      .join("; ");
    return [
      order.id,
      formatDateTime(order.createdAt),
      ORDER_STATUS_LABELS[order.status] ?? order.status,
      order.user?.name ?? "—",
      order.user?.email ?? "—",
      order.phone ?? "—",
      order.address,
      order.comment ?? "—",
      itemsCount,
      formatMoney(order.totalAmount),
      itemsSummary,
    ];
  });

  const lineItemRows: (string | number)[][] = [];
  for (const order of orders) {
    for (const item of order.items) {
      lineItemRows.push([
        order.id,
        formatDateTime(order.createdAt),
        item.product?.name ?? "—",
        item.quantity,
        formatMoney(item.price),
        formatMoney(Number(item.price) * item.quantity),
      ]);
    }
  }

  const parts = [
    `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>Статистика ${escapeHtml(date)}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111; }
  h1 { font-size: 16pt; margin: 0 0 8px; }
  h2 { font-size: 13pt; margin: 24px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  p.meta { color: #555; margin: 0 0 16px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 8px; }
  th, td { border: 1px solid #c5c5c5; padding: 6px 8px; vertical-align: top; text-align: left; }
  th { background: #f3f4f6; font-weight: 700; }
  tr:nth-child(even) td { background: #fafafa; }
</style>
</head>
<body>`,
    `<h1>Отчёт по статистике магазина</h1>`,
    `<p class="meta">Дата отчёта: <strong>${escapeHtml(date)}</strong> · сформирован ${escapeHtml(formatDateTime(new Date()))}</p>`,
    section(
      "1. Показатели за выбранный день",
      kvTable([
        ["Заказов создано", summary.ordersDay],
        ["Выручка по доставленным (DELIVERED)", `${formatMoney(summary.revenueDay)} б.р.`],
        ["Новых пользователей", summary.newUsersDay],
        ["Отзывов", summary.reviewsDay],
        ["Сообщений в чатах", summary.messagesDay],
      ]),
    ),
    section(
      "2. Общая сводка (на момент выгрузки)",
      kvTable([
        ["Всего заказов", summary.totalOrders],
        ["Всего пользователей", summary.totalUsers],
        ["Всего товаров", summary.totalProducts],
        ["Выручка (доставленные, всего)", `${formatMoney(summary.revenueAll)} б.р.`],
        ["Заказов в ожидании (PENDING)", summary.pendingOrders],
        ["Непрочитанных сообщений в чатах", summary.unreadChats],
      ]),
    ),
    section("3. Заказы по статусам за день", table(["Статус", "Кол-во"], statusDayRows)),
    section(
      "4. Заказы по статусам (все время)",
      table(["Статус", "Кол-во"], statusAllRows),
    ),
    section(
      "5. Заказы за день (детально)",
      orderRows.length
        ? table(
            [
              "ID",
              "Дата и время",
              "Статус",
              "Клиент",
              "Эл. почта",
              "Телефон",
              "Адрес",
              "Комментарий",
              "Позиций",
              "Сумма, б.р.",
              "Состав",
            ],
            orderRows,
          )
        : "<p>За выбранный день заказов нет.</p>",
    ),
    section(
      "6. Позиции заказов за день",
      lineItemRows.length
        ? table(
            [
              "Заказ ID",
              "Дата заказа",
              "Товар",
              "Кол-во",
              "Цена за шт.",
              "Сумма строки",
            ],
            lineItemRows,
          )
        : "<p>Нет позиций.</p>",
    ),
    section(
      "7. Новые пользователи за день",
      payload.newUsers.length
        ? table(
            ["ID", "Имя", "Эл. почта", "Роль", "Почта подтверждена", "Регистрация"],
            payload.newUsers.map((u) => [
              u.id,
              u.name,
              u.email,
              u.role === "ADMIN" ? "Администратор" : "Пользователь",
              u.isEmailVerified ? "Да" : "Нет",
              formatDateTime(u.createdAt),
            ]),
          )
        : "<p>Новых пользователей нет.</p>",
    ),
    section(
      "8. Отзывы за день",
      payload.reviews.length
        ? table(
            ["ID", "Дата", "Оценка", "Товар", "Автор", "Эл. почта", "Текст"],
            payload.reviews.map((r) => [
              r.id,
              formatDateTime(r.createdAt),
              r.rating,
              r.product.name,
              r.user.name,
              r.user.email,
              r.comment ?? "—",
            ]),
          )
        : "<p>Отзывов за день нет.</p>",
    ),
    section(
      "9. Сообщения чатов за день",
      payload.messages.length
        ? table(
            ["ID", "Дата", "Диалог", "Автор", "Роль", "Прочитано", "Текст"],
            payload.messages.map((m) => [
              m.id,
              formatDateTime(m.createdAt),
              m.chatRoomId,
              m.user.name,
              m.user.role === "ADMIN" ? "Админ" : "Пользователь",
              m.isRead ? "Да" : "Нет",
              m.content.length > 500 ? `${m.content.slice(0, 500)}…` : m.content,
            ]),
          )
        : "<p>Сообщений за день нет.</p>",
    ),
    section(
      "10. Товары по категориям (каталог)",
      table(
        ["Категория", "Товаров"],
        payload.productsByCategory.map((row) => [row.categoryName, row.count]),
      ),
    ),
    section(
      "11. Товары с низким остатком (≤ 5 шт.)",
      payload.lowStock.length
        ? table(
            ["ID", "Название", "Категория", "Бренд", "Остаток", "Цена, б.р."],
            payload.lowStock.map((p) => [
              p.id,
              p.name,
              p.category?.name ?? "—",
              p.brand?.name ?? "—",
              p.stock,
              formatMoney(p.price),
            ]),
          )
        : "<p>Товаров с низким остатком нет.</p>",
    ),
    section(
      "12. Топ продаж за день (по количеству)",
      payload.topSold.length
        ? table(
            ["Товар", "Продано шт.", "Сумма, б.р."],
            payload.topSold.map((row) => [
              row.productName,
              row.quantity,
              formatMoney(row.revenue),
            ]),
          )
        : "<p>Продаж за день нет.</p>",
    ),
    "</body></html>",
  ];

  return parts.join("\n");
}
