import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Users,
  Package,
  Wallet,
  ArrowRight,
  Download,
} from "lucide-react";
import api from "../../lib/api";
import { Price } from "../../components/Price";
import {
  formatOrderDate,
  orderStatusBadgeClass,
  orderStatusLabels,
} from "../../lib/orderStatus";
import { AdminStatsSkeleton } from "../../components/skeleton/Skeleton";
import { pendingOrdersHint } from "../../lib/pluralize";

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
  const [exportDate, setExportDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [exporting, setExporting] = useState(false);

  const exportStats = async () => {
    if (!exportDate) return;
    setExporting(true);
    try {
      const response = await api.get("/admin/stats/export", {
        params: { date: exportDate },
        responseType: "blob",
      });
      const blob = new Blob([response.data], {
        type: "application/vnd.ms-excel;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `admin-stats-${exportDate}.xls`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const metrics = [
    {
      label: "Заказов",
      value: data?.totalOrders,
      icon: ShoppingBag,
      hint: data?.pendingOrders
        ? pendingOrdersHint(data.pendingOrders)
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
      value:
        data?.revenue != null ? (
          <Price value={data.revenue} />
        ) : (
          <Price value={0} />
        ),
      icon: Wallet,
    },
  ];

  const statusRows = STATUS_ORDER.map((status) => ({
    status,
    count: data?.ordersByStatus?.[status] ?? 0,
  }));

  const recentOrders = (data?.recentOrders ?? []).slice(0, 3);

  if (isLoading) {
    return <AdminStatsSkeleton />;
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col space-y-4 sm:space-y-5 xl:space-y-6">
      <div className="min-w-0">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ns-muted">
          Детальный отчёт за день
        </label>
        <div className="ns-admin-stats-export">
          <input
            type="date"
            value={exportDate}
            onChange={(e) => setExportDate(e.target.value)}
            className="ns-input ns-admin-stats-export__date"
          />
          <button
            type="button"
            onClick={exportStats}
            disabled={!exportDate || exporting}
            className="ns-btn ns-btn-secondary shrink-0"
          >
            <Download size={16} strokeWidth={1.75} />
            {exporting ? "Выгрузка..." : "Скачать отчёт"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 xl:gap-5">
        {metrics.map(({ label, value, icon: Icon, hint }) => (
          <div
            key={label}
            className="ns-card-static flex flex-col gap-2.5 sm:gap-3 xl:gap-4 p-4 sm:p-5 xl:p-6 min-w-0"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-ns-muted leading-tight">
                {label}
              </p>
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-btn)] bg-ns-hover text-ns-icon">
                <Icon size={16} strokeWidth={1.75} />
              </span>
            </div>
            <p className="text-2xl sm:text-3xl xl:text-4xl font-bold leading-none text-ns-text tabular-nums">
              {value ?? "–"}
            </p>
            {hint && (
              <p className="text-xs text-ns-muted leading-snug">{hint}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 xl:gap-5">
        <div className="ns-card-static flex min-h-[220px] flex-col p-4 sm:min-h-[260px] sm:p-5 xl:p-6">
          <h2 className="shrink-0 text-sm xl:text-base font-semibold text-ns-text">
            Заказы по статусам
          </h2>
          <div className="flex min-h-0 flex-1 flex-col justify-center pt-3 xl:pt-4">
            <ul className="w-full space-y-2">
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
                  {count}
                </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="ns-card-static flex min-h-[220px] flex-col p-4 sm:min-h-[260px] sm:p-5 xl:p-6">
          <div className="flex items-center justify-between gap-2 mb-3 xl:mb-4">
            <h2 className="text-sm xl:text-base font-semibold text-ns-text">
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
          {recentOrders.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
              <ShoppingBag
                size={48}
                strokeWidth={1.25}
                className="text-ns-muted shrink-0"
                aria-hidden
              />
              <p className="text-sm xl:text-base text-ns-muted">
                Заказов пока нет
              </p>
            </div>
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
                          · {order.user?.name ?? "–"}
                        </span>
                      </p>
                      <p className="text-xs text-ns-muted mt-0.5">
                        {formatOrderDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-ns-text tabular-nums">
                        <Price value={order.totalAmount} />
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

    </div>
  );
}
