import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { formatPrice } from "../lib/format";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const statusLabels: Record<string, string> = {
  PENDING: "Ожидает",
  CONFIRMED: "Подтверждён",
  SHIPPED: "Отправлен",
  DELIVERED: "Доставлен",
  CANCELLED: "Отменён",
};

const statusBadge: Record<string, string> = {
  PENDING:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  SHIPPED:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  DELIVERED:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function OrdersPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get("/orders").then((r) => r.data),
  });
  const { data: expandedOrder } = useQuery({
    queryKey: ["order", expanded],
    queryFn: () => api.get(`/orders/${expanded}`).then((r) => r.data),
    enabled: expanded !== null,
  });
  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/orders/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      if (expanded) qc.invalidateQueries({ queryKey: ["order", expanded] });
    },
  });

  if (!orders.length)
    return (
      <div className="text-center py-20 text-ns-muted text-base">
        Заказов пока нет
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-8">
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-ns-text tracking-tight">
          Мои заказы
        </h1>
      </div>
      <div className="space-y-4">
        {orders.map((order: any) => {
          const currentOrder =
            expanded === order.id && expandedOrder?.id === order.id
              ? expandedOrder
              : order;
          const items = Array.isArray(currentOrder.items) ? currentOrder.items : [];

          return (
            <div
              key={order.id}
              className="aurora-card rounded-2xl overflow-hidden"
            >
              <div
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-5 cursor-pointer transition-colors gap-2 ${
                  expanded === order.id
                    ? "bg-ns-accent text-ns-accent-fg"
                    : "ns-row-hover"
                }`}
                onClick={() =>
                  setExpanded(expanded === order.id ? null : order.id)
                }
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`font-semibold ${
                      expanded === order.id
                        ? "text-ns-text"
                        : "text-ns-text"
                    }`}
                  >
                    #{order.id}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      expanded === order.id
                        ? "text-ns-text/85"
                        : "text-ns-muted"
                    }`}
                  >
                    {currentOrder.user?.name ?? "Пользователь"}
                  </span>
                  <span
                    className={`text-xs ${
                      expanded === order.id
                        ? "text-ns-text/75"
                        : "text-ns-muted"
                    }`}
                  >
                    {new Date(order.createdAt).toLocaleDateString("ru-BY")}
                  </span>
                </div>
                <div className="flex items-center gap-3 justify-between sm:justify-end">
                  <span
                    className={`font-semibold ${
                      expanded === order.id
                        ? "text-ns-text"
                        : "text-ns-text"
                    }`}
                  >
                    {formatPrice(order.totalAmount)}
                  </span>
                  <span
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusBadge[order.status]}`}
                  >
                    {statusLabels[order.status]}
                  </span>
                  <ChevronDown
                    size={16}
                    strokeWidth={1.5}
                    className={`transition-transform ${
                      expanded === order.id
                        ? "text-ns-text rotate-180"
                        : "text-ns-muted"
                    }`}
                  />
                </div>
              </div>
              {expanded === order.id && (
                <div className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-ns-muted mb-1">
                        Адрес
                      </p>
                      <p className="font-medium text-ns-text">
                        {currentOrder.address || "—"}
                      </p>
                    </div>
                    {currentOrder.phone && (
                      <div>
                        <p className="text-xs font-semibold text-ns-muted mb-1">
                          Телефон
                        </p>
                        <p className="font-medium text-ns-text">
                          {currentOrder.phone}
                        </p>
                      </div>
                    )}
                    {currentOrder.comment && (
                      <div className="col-span-2">
                        <p className="text-xs font-semibold text-ns-muted mb-1">
                          Комментарий
                        </p>
                        <p className="font-medium text-ns-text">
                          {currentOrder.comment}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 pt-3">
                    {items.length > 0 ? (
                      items.map((item: any, index: number) => {
                        const productName =
                          item.product?.name ||
                          item.name ||
                          item.title ||
                          `Товар #${item.productId ?? index + 1}`;
                        const quantity = Number(item.quantity) || 0;
                        const unitPrice = Number(
                          item.price ?? item.unitPrice ?? item.product?.price ?? 0,
                        );
                        const lineTotal = unitPrice * quantity;
                        const slug = item.product?.slug;
                        const label = (
                          <span className="font-medium text-ns-muted">
                            {productName} × {quantity}
                          </span>
                        );

                        return (
                          <div
                            key={item.id ?? `${order.id}-${item.productId ?? index}`}
                            className="flex justify-between text-sm gap-4"
                          >
                            {slug ? (
                              <Link
                                to={`/catalog/${slug}`}
                                className="min-w-0 hover:text-ns-text underline underline-offset-2 hover:text-ns-text-secondary transition-colors"
                              >
                                {label}
                              </Link>
                            ) : (
                              label
                            )}
                            <span className="font-semibold text-ns-text whitespace-nowrap">
                              {formatPrice(lineTotal)}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-ns-muted">
                        Состав заказа недоступен
                      </p>
                    )}
                  </div>
                  {["PENDING", "CONFIRMED"].includes(order.status) && (
                    <div className="pt-2">
                      <button
                        onClick={() => cancelMutation.mutate(order.id)}
                        disabled={cancelMutation.isPending}
                        className="px-5 py-2.5 text-sm font-medium rounded-full bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors disabled:opacity-40"
                      >
                        Отменить заказ
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
