import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import api from "../../lib/api";

import { formatPrice } from "../../lib/format";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ShoppingBag } from "lucide-react";

import { pluralizeOrders } from "../../lib/pluralize";

import OrderItemRow from "../../components/OrderItemRow";
import OrderCardSummary from "../../components/OrderCardSummary";
import { OrderListSkeleton } from "../../components/skeleton/Skeleton";
import { orderStatusLabels } from "../../lib/orderStatus";



const NEXT_STATUSES: Record<string, string[]> = {

  PENDING: ["CONFIRMED", "CANCELLED"],

  CONFIRMED: ["SHIPPED", "CANCELLED"],

  SHIPPED: ["DELIVERED", "CANCELLED"],

  DELIVERED: [],

  CANCELLED: [],

};



export default function AdminOrdersPage() {

  const qc = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();

  const [expanded, setExpanded] = useState<number | null>(null);

  const cardRefs = useRef<Record<number, HTMLElement | null>>({});



  const { data: orders, isPending } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => api.get("/orders").then((r) => r.data),
  });
  const orderList = orders ?? [];



  const orderFromUrl = (() => {

    const raw = searchParams.get("order");

    if (!raw) return null;

    const id = parseInt(raw, 10);

    return Number.isFinite(id) ? id : null;

  })();



  useEffect(() => {

    if (orderFromUrl == null || orderList.length === 0) return;

    if (orderList.some((o: { id: number }) => o.id === orderFromUrl)) {

      setExpanded(orderFromUrl);

    }

  }, [orderFromUrl, orderList]);



  useEffect(() => {

    if (expanded == null) return;

    const el = cardRefs.current[expanded];

    if (!el) return;

    const t = window.setTimeout(() => {

      el.scrollIntoView({ behavior: "smooth", block: "nearest" });

    }, 80);

    return () => window.clearTimeout(t);

  }, [expanded, orderList.length]);



  const toggleOrder = (orderId: number, isOpen: boolean) => {

    if (isOpen) {

      setExpanded(null);

      if (searchParams.has("order")) {

        setSearchParams({}, { replace: true });

      }

      return;

    }

    setExpanded(orderId);

    setSearchParams({ order: String(orderId) }, { replace: true });

  };



  const statusMutation = useMutation({

    mutationFn: ({ id, status }: { id: number; status: string }) =>

      api.put(`/orders/${id}/status`, { status }),

    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orders"] }),

  });



  return (

    <div className="flex min-h-0 w-full flex-1 flex-col space-y-4 sm:space-y-5">

      <p className="text-sm sm:text-base font-semibold text-ns-muted">

        Всего: {isPending ? "…" : pluralizeOrders(orderList.length)}

      </p>



      {isPending ? (
        <OrderListSkeleton count={4} />
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

            const items = Array.isArray(order.items) ? order.items : [];



            return (

              <article

                key={order.id}

                ref={(el) => {

                  cardRefs.current[order.id] = el;

                }}

                className="aurora-card rounded-2xl overflow-hidden"

              >

                <button

                  type="button"

                  className={`w-full text-left px-4 py-4 sm:px-5 sm:py-4 transition-colors cursor-pointer ${

                    isOpen

                      ? "bg-ns-hover border-b border-ns-border"

                      : "ns-row-hover"

                  }`}

                  onClick={() => toggleOrder(order.id, isOpen)}

                  aria-expanded={isOpen}

                >

                  <OrderCardSummary
                    orderId={order.id}
                    status={order.status}
                    createdAt={order.createdAt}
                    totalAmount={order.totalAmount}
                    subtitle={order.user?.name ?? "Пользователь"}
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

                          {order.address || "—"}

                        </p>

                      </div>

                      {order.phone && (

                        <div className="min-w-0">

                          <p className="text-xs font-semibold text-ns-muted mb-1">

                            Телефон

                          </p>

                          <p className="font-medium text-ns-text">

                            {order.phone}

                          </p>

                        </div>

                      )}

                      {order.comment && (

                        <div className="sm:col-span-2 min-w-0">

                          <p className="text-xs font-semibold text-ns-muted mb-1">

                            Комментарий

                          </p>

                          <p className="font-medium text-ns-text break-words">

                            {order.comment}

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

                              linkToCatalog={false}

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



                    {NEXT_STATUSES[order.status]?.length > 0 && (

                      <div className="flex gap-2 flex-wrap">

                        {NEXT_STATUSES[order.status].map((s) => (

                          <button

                            key={s}

                            type="button"

                            onClick={() =>

                              statusMutation.mutate({

                                id: order.id,

                                status: s,

                              })

                            }

                            disabled={statusMutation.isPending}

                            className={`ns-btn text-sm disabled:opacity-40 ${

                              s === "CANCELLED"

                                ? "ns-btn-secondary text-[var(--ns-error)] hover:bg-[color-mix(in_srgb,var(--ns-error)_10%,transparent)]"

                                : "ns-btn-primary"

                            }`}

                          >

                            {orderStatusLabels[s]}

                          </button>

                        ))}

                      </div>

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

