import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { Price } from "../components/Price";
import AddressInput from "../components/AddressInput";
import PhoneInput from "../components/PhoneInput";
import { ShoppingCart, Package } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import MediaImage from "../components/MediaImage";
import { CheckoutPageSkeleton } from "../components/skeleton/Skeleton";

interface FormState {
  address: string;
  phone: string;
  comment: string;
}
interface TouchedState {
  address: boolean;
  phone: boolean;
}

const validatePhone = (v: string) =>
  v.replace(/\D/g, "").length !== 12 ? "Введите полный номер телефона" : "";
const validateAddress = (v: string) =>
  !v.trim() ? "Укажите адрес доставки" : "";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [form, setForm] = useState<FormState>({
    address: "",
    phone: "",
    comment: "",
  });
  const [touched, setTouched] = useState<TouchedState>({
    address: false,
    phone: false,
  });

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      address: prev.address || user.address || "",
      phone: prev.phone || user.phone || "",
    }));
  }, [user?.id]);

  const { data: items = [], isPending: cartPending } = useQuery({
    queryKey: ["cart"],
    queryFn: () => api.get("/cart").then((r) => r.data),
  });
  const total = items.reduce(
    (s: number, i: any) => s + Number(i.product.price) * i.quantity,
    0,
  );
  const errors = {
    address: validateAddress(form.address),
    phone: validatePhone(form.phone),
  };
  const isValid = !errors.address && !errors.phone;

  const orderMutation = useMutation({
    mutationFn: () =>
      api.post("/orders", {
        address: form.address,
        phone: form.phone,
        comment: form.comment,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      navigate("/orders");
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      useToastStore
        .getState()
        .show(
          err.response?.data?.message ?? "Не удалось оформить заказ",
          "error",
        );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ address: true, phone: true });
    if (!isValid) return;
    orderMutation.mutate();
  };

  if (cartPending) {
    return <CheckoutPageSkeleton />;
  }

  if (!items.length)
    return (
      <div className="ns-page-empty">
        <ShoppingCart strokeWidth={1} className="ns-page-empty__icon" />
        <p className="text-lg text-ns-muted">
          Корзина пуста
        </p>
      </div>
    );

  return (
    <div className="w-full min-w-0 mx-auto py-6 sm:py-8">
      <h1 className="ns-heading-page mb-4 sm:mb-5">Оформление заказа</h1>

      <div className="grid md:grid-cols-2 gap-5 lg:gap-6 items-start">
        <div className="aurora-card rounded-2xl p-4 sm:p-5 md:max-h-[calc(100vh-12rem)] flex flex-col">
          <p className="text-sm font-semibold text-ns-text mb-3 shrink-0">
            Состав заказа
          </p>
          <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1 -mr-1 scrollbar-thin">
            {items.map((item: any) => (
              <Link
                key={item.productId}
                to={`/catalog/${item.product.slug}`}
                className="flex items-center gap-3 p-3 rounded-xl ns-chip hover:bg-ns-hover transition-colors min-w-0"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 ns-thumb rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
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
                  <p className="text-sm font-medium text-ns-text line-clamp-2 leading-snug">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-ns-text-secondary mt-1 tabular-nums">
                    {item.quantity} шт. · <Price inline value={item.product.price} /> за шт.
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <div className="flex justify-between items-center pt-4 mt-4 border-t border-ns-border shrink-0">
            <span className="text-sm font-semibold text-ns-text">
              Итого
            </span>
            <span className="font-semibold text-ns-text text-lg">
              <Price value={total} />
            </span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="aurora-card rounded-2xl p-4 sm:p-5 space-y-4 h-fit"
          noValidate
        >
          <p className="text-sm font-semibold text-ns-text">
            Данные доставки
          </p>
          <AddressInput
            value={form.address}
            onChange={(v) => setForm((p) => ({ ...p, address: v }))}
            error={errors.address}
            touched={touched.address}
          />
          <PhoneInput
            value={form.phone}
            onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
            error={errors.phone}
            touched={touched.phone}
          />
          <div>
            <label className="block text-sm font-medium text-ns-text mb-2">
              Комментарий
            </label>
            <textarea
              rows={3}
              placeholder="Дополнительные пожелания..."
              className="ns-textarea w-full text-sm resize-none"
              value={form.comment}
              onChange={(e) =>
                setForm((p) => ({ ...p, comment: e.target.value }))
              }
            />
          </div>
          <button
            type="submit"
            disabled={orderMutation.isPending || !isValid}
            className="aurora-button w-full py-3.5 text-sm font-medium transition-transform hover:scale-[1.01] disabled:opacity-55"
          >
            {orderMutation.isPending ? "Оформляем..." : "Подтвердить заказ"}
          </button>
        </form>
      </div>
    </div>
  );
}
