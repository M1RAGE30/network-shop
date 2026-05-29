import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import api from "../lib/api";
import { formatPrice } from "../lib/format";
import OrderItemRow from "../components/OrderItemRow";
import OrderCardSummary from "../components/OrderCardSummary";
import { OrderListSkeleton } from "../components/skeleton/Skeleton";

export default function OrdersPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: orders, isPending } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get("/orders").then((r) => r.data),
  });
  const orderList = orders ?? [];

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

  return (
    <div className="ns-page-narrow w-full min-w-0 py-6 sm:py-8">
      <h1 className="ns-heading-page mb-4 sm:mb-5">Мои заказы</h1>

      {isPending ? (
        <OrderListSkeleton />
      ) : orderList.length === 0 ? (
        <div className="py-16 text-center">
          <ShoppingBag
            size={48}
            strokeWidth={1.25}
            className="mx-auto mb-4 text-ns-muted"
            aria-hidden
          />
          <p className="text-lg text-ns-muted">Заказов пока нет</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {orderList.map((order: any) => {
            const isOpen = expanded === order.id;
            const currentOrder =
              isOpen && expandedOrder?.id === order.id ? expandedOrder : order;
            const items = Array.isArray(currentOrder.items)
              ? currentOrder.items
              : [];

            return (
              <article
                key={order.id}
                className="aurora-card rounded-2xl overflow-hidden"
              >
                <button
                  type="button"
                  className={`w-full text-left px-4 py-4 sm:px-5 sm:py-4 transition-colors cursor-pointer ${
                    isOpen
                      ? "bg-ns-hover border-b border-ns-border"
                      : "ns-row-hover"
                  }`}
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  aria-expanded={isOpen}
                >
                  <OrderCardSummary
                    orderId={order.id}
                    status={order.status}
                    createdAt={order.createdAt}
                    totalAmount={order.totalAmount}
                    isOpen={isOpen}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 py-4 sm:px-5 sm:pb-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ns-muted mb-1">
                          Адрес
                        </p>
                        <p className="font-medium text-ns-text break-words">
                          {currentOrder.address || "—"}
                        </p>
                      </div>

                      {currentOrder.phone && (
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-ns-muted mb-1">
                            Телефон
                          </p>
                          <p className="font-medium text-ns-text">
                            {currentOrder.phone}
                          </p>
                        </div>
                      )}

                      {currentOrder.comment && (
                        <div className="sm:col-span-2 min-w-0">
                          <p className="text-xs font-semibold text-ns-muted mb-1">
                            Комментарий
                          </p>
                          <p className="font-medium text-ns-text break-words">
                            {currentOrder.comment}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-ns-text mb-2">
                        Состав заказа
                      </p>
                      <div className="space-y-2">
                        {items.length > 0 ? (
                          items.map((item: any, index: number) => (
                            <OrderItemRow
                              key={
                                item.id ??
                                `${order.id}-${item.productId ?? index}`
                              }
                              item={item}
                              index={index}
                            />
                          ))
                        ) : (
                          <p className="text-sm text-ns-muted py-2">
                            Состав заказа недоступен
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-ns-border">
                      <span className="text-sm font-semibold text-ns-text">
                        Итого
                      </span>
                      <span className="text-lg font-semibold text-ns-text tabular-nums">
                        {formatPrice(order.totalAmount)}
                      </span>
                    </div>

                    {["PENDING", "CONFIRMED"].includes(order.status) && (
                      <button
                        type="button"
                        onClick={() => cancelMutation.mutate(order.id)}
                        disabled={cancelMutation.isPending}
                        className="ns-btn ns-btn-secondary text-[var(--ns-error)] hover:bg-[color-mix(in_srgb,var(--ns-error)_10%,transparent)] disabled:opacity-40"
                      >
                        Отменить заказ
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
