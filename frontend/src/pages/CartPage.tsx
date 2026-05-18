import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, ShoppingBag, Trash2, Package } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { formatPrice } from "../lib/format";
import MediaImage from "../components/MediaImage";

export default function CartPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: items = [] } = useQuery({
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
  });

  const removeMutation = useMutation({
    mutationFn: (productId: number) => api.delete(`/cart/${productId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });

  const total = items.reduce(
    (s: number, i: any) => s + Number(i.product.price) * i.quantity,
    0,
  );

  if (!items.length) {
    return (
      <div className="text-center py-20">
        <ShoppingBag
          size={64}
          strokeWidth={1}
          className="mx-auto text-ns-muted mb-4"
        />
        <p className="text-lg text-ns-muted">
          Корзина пуста
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 mx-auto py-10 space-y-8">
      <div className="pb-6">
        <h1 className="ns-heading-page">Корзина</h1>
      </div>

      <div className="ns-cart-layout">
        <div className="aurora-card rounded-3xl p-5 sm:p-6 space-y-4">
          {items.map((item: any) => (
            <div
              key={item.productId}
              className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 rounded-2xl ns-chip"
            >
              <Link
                to={`/catalog/${item.product.slug}`}
                className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0 rounded-xl hover:opacity-90 transition-opacity"
              >
                <div className="w-16 h-16 ns-thumb rounded-xl flex items-center justify-center shrink-0">
                  {item.product.imageUrl ? (
                    <MediaImage
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <Package
                      size={28}
                      strokeWidth={1.25}
                      className="text-ns-muted"
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-medium text-ns-text leading-snug break-words">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-ns-muted mt-1">
                    Бренд:{" "}
                    <span className="font-semibold text-ns-text">
                      {item.product.brand?.name || "—"}
                    </span>
                  </p>
                  <p className="text-lg font-semibold text-ns-text mt-2">
                    {formatPrice(item.product.price)}
                  </p>
                </div>
              </Link>

              <div className="flex items-center sm:flex-col sm:items-end gap-3 shrink-0">
                <button
                  onClick={() => removeMutation.mutate(item.productId)}
                  className="text-ns-muted hover:text-red-500 transition-colors"
                  title="Удалить товар"
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      item.quantity <= 1
                        ? removeMutation.mutate(item.productId)
                        : updateMutation.mutate({
                            productId: item.productId,
                            quantity: item.quantity - 1,
                          })
                    }
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-ns-elevated border border-ns-border hover:bg-ns-hover disabled:opacity-30 transition-colors text-ns-text"
                  >
                    <Minus size={13} strokeWidth={2} />
                  </button>
                  <span className="w-7 text-center text-sm font-semibold text-ns-text">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateMutation.mutate({
                        productId: item.productId,
                        quantity: item.quantity + 1,
                      })
                    }
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-ns-elevated border border-ns-border hover:bg-ns-hover transition-colors text-ns-text"
                  >
                    <Plus size={13} strokeWidth={2} />
                  </button>
                </div>
                <span className="text-sm font-semibold text-ns-text whitespace-nowrap">
                  {formatPrice(Number(item.product.price) * item.quantity)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="aurora-card rounded-3xl p-5 sm:p-6 h-fit">
          <p className="text-sm font-semibold text-ns-muted mb-4">
            Итого к оплате
          </p>
          <p className="text-3xl font-semibold text-ns-text mb-6">
            {formatPrice(total)}
          </p>
          <button
            onClick={() => navigate("/orders/new")}
            className="aurora-button w-full py-3.5 rounded-full text-base font-medium transition-transform hover:scale-[1.01]"
          >
            Оформить заказ
          </button>
        </div>
      </div>
    </div>
  );
}

