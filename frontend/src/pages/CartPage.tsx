import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, ShoppingCart, Trash2, Package } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Price } from "../components/Price";
import MediaImage from "../components/MediaImage";
import { CartPageSkeleton } from "../components/skeleton/Skeleton";
import { useToastStore } from "../store/toastStore";

export default function CartPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: items = [], isPending } = useQuery({
    queryKey: ["cart"],
    queryFn: () => api.get("/cart").then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: number;
      quantity: number;
    }) => api.put(`/cart/${productId}`, { quantity }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
    onError: (err: { response?: { data?: { message?: string } } }) => {
      useToastStore
        .getState()
        .show(
          err.response?.data?.message ?? "Не удалось изменить количество",
          "error",
        );
    },
  });

  const removeMutation = useMutation({
    mutationFn: (productId: number) => api.delete(`/cart/${productId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
    onError: (err: { response?: { data?: { message?: string } } }) => {
      useToastStore
        .getState()
        .show(
          err.response?.data?.message ?? "Не удалось удалить товар",
          "error",
        );
    },
  });

  const total = items.reduce(
    (s: number, i: any) => s + Number(i.product.price) * i.quantity,
    0,
  );

  if (isPending) {
    return <CartPageSkeleton />;
  }

  if (!items.length) {
    return (
      <div className="ns-page-empty">
        <ShoppingCart strokeWidth={1} className="ns-page-empty__icon" />
        <p className="text-lg text-ns-muted">
          Корзина пуста
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 mx-auto py-6 sm:py-8">
      <h1 className="ns-heading-page mb-4 sm:mb-5">Корзина</h1>

      <div className="ns-cart-layout">
        <div className="aurora-card rounded-2xl p-4 sm:p-5 md:max-h-[calc(100vh-12rem)] flex flex-col min-h-0 w-full min-w-0">
          <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1 -mr-1 scrollbar-thin">
          {items.map((item: any) => (
            <div
              key={item.productId}
              className="flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl ns-chip"
            >
              <Link
                to={`/catalog/${item.product.slug}`}
                className="flex flex-1 min-w-0 gap-3 sm:gap-4 rounded-lg hover:opacity-90 transition-opacity"
              >
                <div className="w-14 h-14 sm:w-14 sm:h-14 ns-thumb rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  {item.product.imageUrl ? (
                    <MediaImage
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package
                      size={24}
                      strokeWidth={1.25}
                      className="text-ns-muted"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ns-text leading-snug line-clamp-2">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-ns-text-secondary mt-0.5">
                    {item.product.brand?.name || "–"}
                  </p>
                  <p className="text-sm font-semibold text-ns-text mt-1.5 tabular-nums">
                    <Price value={item.product.price} />
                    <span className="text-xs font-normal text-ns-text-secondary ml-1">
                      за шт.
                    </span>
                  </p>
                </div>
              </Link>

              <div className="flex flex-col items-end justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(item.productId)}
                  className="ns-action-icon ns-action-icon--danger transition-colors p-1"
                  title="Удалить"
                  aria-label="Удалить"
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      item.quantity <= 1
                        ? removeMutation.mutate(item.productId)
                        : updateMutation.mutate({
                            productId: item.productId,
                            quantity: item.quantity - 1,
                          })
                    }
                    className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-btn)] border border-ns-border bg-ns-elevated text-ns-text transition-colors hover:bg-ns-hover disabled:opacity-50"
                  >
                    <Minus size={14} strokeWidth={2} />
                  </button>
                  <span className="inline-grid h-8 min-w-[1.75rem] place-items-center text-sm font-semibold leading-none tabular-nums text-ns-text">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    disabled={item.quantity >= item.product.stock}
                    onClick={() =>
                      updateMutation.mutate({
                        productId: item.productId,
                        quantity: item.quantity + 1,
                      })
                    }
                    className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-btn)] border border-ns-border bg-ns-elevated text-ns-text transition-colors hover:bg-ns-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-ns-elevated"
                  >
                    <Plus size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>

        <div className="aurora-card rounded-2xl p-4 sm:p-5 h-fit">
          <p className="text-sm font-medium text-ns-text-secondary mb-3">
            Итого к оплате
          </p>
          <p className="text-2xl font-semibold text-ns-text mb-5">
            <Price value={total} />
          </p>
          <button
            onClick={() => navigate("/orders/new")}
            className="aurora-button w-full py-3.5 text-sm font-medium transition-transform hover:scale-[1.01]"
          >
            Оформить заказ
          </button>
        </div>
      </div>
    </div>
  );
}

