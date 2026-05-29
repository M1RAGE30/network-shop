import { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Minus, Plus, Trash2, ShoppingCart, Package } from "lucide-react";
import api from "../lib/api";
import { formatPrice } from "../lib/format";
import { useAuthStore } from "../store/authStore";
import { isCustomer } from "../lib/roles";
import MediaImage from "./MediaImage";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { user } = useAuthStore();
  const canShop = isCustomer(user);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: items = [] } = useQuery({
    queryKey: ["cart"],
    queryFn: () => api.get("/cart").then((r) => r.data),
    enabled: canShop,
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

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.documentElement.style.overflow = "";
      return;
    }
    const scrollY = window.scrollY;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      const top = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.documentElement.style.overflow = "";
      if (top) {
        window.scrollTo(0, Math.abs(parseInt(top, 10)));
      }
    };
  }, [open]);

  const handleClose = () => {
    const params = new URLSearchParams(location.search);
    params.delete("cart");
    const search = params.toString();
    navigate(location.pathname + (search ? `?${search}` : ""), {
      replace: true,
    });
    onClose();
  };

  const total = items.reduce(
    (s: number, i: any) => s + Number(i.product.price) * i.quantity,
    0,
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm dark:bg-black/60"
          onClick={handleClose}
          aria-hidden
        />
      )}
      <div
        className={`aurora-panel fixed inset-y-0 right-0 w-[50vw] max-w-md z-[70] flex flex-col transform-gpu will-change-transform transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-xl font-semibold text-ns-text">
            Корзина
          </h2>
          <button
            onClick={handleClose}
            className="ns-action-icon text-ns-text"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <ShoppingCart
              size={56}
              strokeWidth={1}
              className="text-ns-muted"
            />
            <p className="text-sm text-ns-muted">
              Корзина пуста
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {items.map((item: any) => (
                <div
                  key={item.productId}
                  className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 rounded-2xl ns-chip"
                >
                  <Link
                    to={`/catalog/${item.product.slug}`}
                    onClick={() => handleClose()}
                    className="flex flex-col sm:flex-row gap-3 min-w-0 flex-1 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 ns-thumb rounded-xl flex items-center justify-center shrink-0">
                      {item.product.imageUrl ? (
                        <MediaImage
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package
                          size={26}
                          strokeWidth={1.25}
                          className="text-ns-muted"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ns-text leading-snug break-words">
                        {item.product.name}
                      </p>
                      <p className="text-base font-semibold text-ns-text mt-2">
                        {formatPrice(item.product.price)}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 shrink-0">
                    <button
                      onClick={() => removeMutation.mutate(item.productId)}
                      className="text-ns-muted hover:text-red-500 transition-colors"
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
                        className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-[var(--radius-btn)] border border-ns-border bg-ns-elevated text-ns-text transition-colors hover:bg-ns-hover disabled:opacity-30"
                      >
                        <Minus size={12} strokeWidth={2} />
                      </button>
                      <span className="inline-grid h-7 min-w-[1.5rem] place-items-center text-sm font-semibold leading-none tabular-nums text-ns-text">
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
                        className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-[var(--radius-btn)] border border-ns-border bg-ns-elevated text-ns-text transition-colors hover:bg-ns-hover disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-ns-elevated"
                      >
                        <Plus size={12} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-5 space-y-4 ns-chip">
              <div className="flex justify-between items-center">
                <span className="text-base text-ns-muted">
                  Итого
                </span>
                <span className="font-semibold text-ns-text text-2xl">
                  {formatPrice(total)}
                </span>
              </div>
              <button
                onClick={() => {
                  handleClose();
                  navigate("/orders/new");
                }}
                className="aurora-button w-full py-3.5 text-base font-medium transition-transform hover:scale-[1.01]"
              >
                Оформить заказ
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
