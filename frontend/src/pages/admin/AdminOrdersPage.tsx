import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import { formatPrice } from "../../lib/format";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { pluralizeOrders } from "../../lib/pluralize";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Ожидает",
  CONFIRMED: "Подтверждён",
  SHIPPED: "Отправлен",
  DELIVERED: "Доставлен",
  CANCELLED: "Отменён",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  SHIPPED:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  DELIVERED:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const NEXT_STATUSES: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export default function AdminOrdersPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => api.get("/orders").then((r) => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.put(`/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-ns-muted">
        Всего: {pluralizeOrders(orders.length)}
      </p>
      {orders.length === 0 && (
        <div className="text-center py-16 text-base text-ns-muted">
          Заказов пока нет
        </div>
      )}
      <div className="space-y-4">
        {orders.map((order: any) => (
          <div
            key={order.id}
            className="aurora-card rounded-2xl overflow-hidden"
          >
            <div
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-5 cursor-pointer transition-colors gap-2 ${
                expanded === order.id
                  ? "bg-white/40 dark:bg-white/10"
                  : "ns-row-hover"
              }`}
              onClick={() =>
                setExpanded(expanded === order.id ? null : order.id)
              }
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className="font-semibold text-ns-text"
                >
                  #{order.id}
                </span>
                <span
                  className="text-sm font-medium text-ns-muted"
                >
                  {order.user?.name}
                </span>
                <span
                  className="text-xs text-ns-muted"
                >
                  {new Date(order.createdAt).toLocaleDateString("ru-BY")}
                </span>
              </div>
              <div className="flex items-center gap-3 justify-between sm:justify-end">
                <span
                  className="font-semibold text-ns-text"
                >
                  {formatPrice(order.totalAmount)}
                </span>
                <span
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_BADGE[order.status]}`}
                >
                  {STATUS_LABELS[order.status]}
                </span>
                <ChevronDown
                  size={16}
                  strokeWidth={1.5}
                  className={`transition-transform ${
                    expanded === order.id
                      ? "text-ns-muted rotate-180"
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
                      {order.address}
                    </p>
                  </div>
                  {order.phone && (
                    <div>
                      <p className="text-xs font-semibold text-ns-muted mb-1">
                        Телефон
                      </p>
                      <p className="font-medium text-ns-text">
                        {order.phone}
                      </p>
                    </div>
                  )}
                  {order.comment && (
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-ns-muted mb-1">
                        Комментарий
                      </p>
                      <p className="font-medium text-ns-text">
                        {order.comment}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-2 pt-3">
                  {Array.isArray(order.items) && order.items.length > 0 ? (
                    order.items.map((item: any, index: number) => {
                      const productName =
                        item.product?.name ||
                        item.name ||
                        item.title ||
                        `Товар #${item.productId ?? index + 1}`;
                      const quantity = Number(item.quantity) || 0;
                      const unitPrice = Number(item.price ?? item.product?.price ?? 0);
                      const lineTotal = unitPrice * quantity;

                      return (
                        <div
                          key={item.id ?? `${order.id}-${item.productId ?? index}`}
                          className="flex justify-between text-sm gap-4"
                        >
                          <span className="font-medium text-ns-muted">
                            {productName} × {quantity}
                          </span>
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
                {NEXT_STATUSES[order.status].length > 0 && (
                  <div className="flex gap-2 pt-2 flex-wrap">
                    {NEXT_STATUSES[order.status].map((s) => (
                      <button
                        key={s}
                        onClick={() =>
                          statusMutation.mutate({ id: order.id, status: s })
                        }
                        disabled={statusMutation.isPending}
                        className={`px-5 py-2.5 text-sm font-medium rounded-full transition-all disabled:opacity-40 ${
                          s === "CANCELLED"
                            ? "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                            : "bg-ns-accent text-ns-accent-fg hover:bg-ns-accent-hover"
                        }`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
