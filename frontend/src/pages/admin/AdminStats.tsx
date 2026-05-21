import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Users,
  Package,
  Wallet,
  Clock,
  ArrowRight,
} from "lucide-react";
import api from "../../lib/api";
import { formatPrice } from "../../lib/format";
import {
  formatOrderDate,
  orderStatusBadgeClass,
  orderStatusLabels,
} from "../../lib/orderStatus";

const STATUS_ORDER = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export default function AdminStats() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.get("/admin/stats").then((r) => r.data),
  });

  const metrics = [
    {
      label: "Заказов",
      value: data?.totalOrders,
      icon: ShoppingBag,
      hint: data?.pendingOrders
        ? `${data.pendingOrders} ожидают`
        : undefined,
    },
    {
      label: "Пользователей",
      value: data?.totalUsers,
      icon: Users,
    },
    {
      label: "Товаров",
      value: data?.totalProducts,
      icon: Package,
    },
    {
      label: "Выручка",
      value: data?.revenue != null ? formatPrice(data.revenue) : "0,00 BYN",
      icon: Wallet,
      hint: "Доставленные заказы",
    },
  ];

  const statusRows = STATUS_ORDER.map((status) => ({
    status,
    count: data?.ordersByStatus?.[status] ?? 0,
  }));

  const recentOrders = data?.recentOrders ?? [];

  return (
    <div className="space-y-4 sm:space-y-5 max-w-5xl">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map(({ label, value, icon: Icon, hint }) => (
          <div
            key={label}
            className="ns-card-static flex flex-col gap-2.5 sm:gap-3 p-4 sm:p-5 min-w-0"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-ns-muted leading-tight">
                {label}
              </p>
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-btn)] bg-ns-hover text-ns-icon">
                <Icon size={16} strokeWidth={1.75} />
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold leading-none text-ns-text tabular-nums">
              {isLoading ? "—" : (value ?? "—")}
            </p>
            {hint && (
              <p className="text-xs text-ns-muted leading-snug">{hint}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div className="ns-card-static p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-ns-text mb-3">
            Заказы по статусам
          </h2>
          <ul className="space-y-2">
            {statusRows.map(({ status, count }) => (
              <li
                key={status}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span
                  className={
                    orderStatusBadgeClass[status] ?? "ns-badge ns-badge--muted"
                  }
                >
                  {orderStatusLabels[status] ?? status}
                </span>
                <span className="font-semibold text-ns-text tabular-nums">
                  {isLoading ? "—" : count}
                </span>
              </li>
            ))}
            {!isLoading && statusRows.every((r) => r.count === 0) && (
              <li className="text-sm text-ns-muted">Заказов пока нет</li>
            )}
          </ul>
        </div>

        <div className="ns-card-static p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold text-ns-text">
              Последние заказы
            </h2>
            <Link
              to="/admin/orders"
              className="text-xs font-medium text-ns-text-secondary hover:text-ns-text inline-flex items-center gap-1"
            >
              Все
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </div>
          {recentOrders.length === 0 && !isLoading ? (
            <p className="text-sm text-ns-muted">Заказов пока нет</p>
          ) : (
            <ul className="space-y-2">
              {recentOrders.map((order: any) => (
                <li key={order.id}>
                  <Link
                    to={`/admin/orders?order=${order.id}`}
                    className="flex items-center justify-between gap-2 rounded-[var(--radius-btn)] px-2 py-2 -mx-2 hover:bg-ns-hover transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ns-text">
                        Заказ #{order.id}
                        <span className="text-ns-muted font-normal">
                          {" "}
                          · {order.user?.name ?? "—"}
                        </span>
                      </p>
                      <p className="text-xs text-ns-muted mt-0.5">
                        {formatOrderDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-ns-text tabular-nums">
                        {formatPrice(order.totalAmount)}
                      </p>
                      <span
                        className={`mt-1 inline-block ${
                          orderStatusBadgeClass[order.status] ??
                          "ns-badge ns-badge--muted"
                        }`}
                      >
                        {orderStatusLabels[order.status] ?? order.status}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {!isLoading && (data?.pendingOrders > 0 || data?.unreadChats > 0) && (
        <div className="ns-card-static flex flex-wrap items-center gap-3 p-4 sm:p-5 text-sm text-ns-text-secondary">
          <Clock size={18} className="text-ns-muted shrink-0" strokeWidth={1.75} />
          <p className="min-w-0 flex-1 leading-snug">
            {data.pendingOrders > 0 && (
              <>
                Ожидают обработки:{" "}
                <strong className="text-ns-text">{data.pendingOrders}</strong>
                {data.unreadChats > 0 ? " · " : ""}
              </>
            )}
            {data.unreadChats > 0 && (
              <>
                Непрочитанных в чатах:{" "}
                <strong className="text-ns-text">{data.unreadChats}</strong>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
