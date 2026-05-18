import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { formatPrice } from "../lib/format";
import AddressInput from "../components/AddressInput";
import PhoneInput from "../components/PhoneInput";
import { ShoppingBag, Package } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import MediaImage from "../components/MediaImage";

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

  const { data: items = [] } = useQuery({
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
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ address: true, phone: true });
    if (!isValid) return;
    orderMutation.mutate();
  };

  if (!items.length)
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

  return (
    <div className="w-full min-w-0 mx-auto py-10 space-y-8">
      <div className="pb-6">
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-ns-text tracking-tight">
          Оформление заказа
        </h1>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="aurora-card rounded-3xl p-6">
            <p className="text-sm font-semibold text-ns-text mb-5 pb-4">
              Состав заказа
            </p>
            <div className="space-y-3">
              {items.map((item: any) => (
                <Link
                  key={item.productId}
                  to={`/catalog/${item.product.slug}`}
                  className="flex items-center gap-3 p-3 rounded-xl ns-chip hover:bg-ns-hover transition-colors min-w-0"
                >
                  <div className="w-14 h-14 bg-ns-elevated border border-ns-border rounded-lg flex items-center justify-center shrink-0">
                    {item.product.imageUrl ? (
                      <MediaImage
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <Package
                        size={26}
                        strokeWidth={1.25}
                        className="text-ns-muted"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ns-text line-clamp-2 leading-snug">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-ns-muted mt-1">
                      × {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-ns-text shrink-0">
                    {formatPrice(Number(item.product.price) * item.quantity)}
                  </span>
                </Link>
              ))}
            </div>
            <div className="flex justify-between pt-4 mt-5">
              <span className="text-base font-semibold text-ns-text">
                Итого
              </span>
              <span className="font-semibold text-ns-text text-xl">
                {formatPrice(total)}
              </span>
            </div>
          </div>

          <div className="aurora-panel rounded-3xl p-6 text-ns-text">
            <p className="text-sm font-semibold mb-4">Доставка</p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                <span className="text-sm">Курьером по Беларуси</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                <span className="text-sm">Самовывоз из пунктов выдачи</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                <span className="text-sm">Доставка от 1 дня</span>
              </div>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="aurora-card rounded-3xl p-6 space-y-6"
          noValidate
        >
          <p className="text-sm font-semibold text-ns-text pb-4">
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
            <label className="block text-sm font-semibold text-ns-text mb-2">
              Комментарий
            </label>
            <textarea
              rows={3}
              placeholder="Дополнительные пожелания..."
              className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ns-accent bg-ns-input text-ns-text placeholder:text-ns-muted  transition-all"
              value={form.comment}
              onChange={(e) =>
                setForm((p) => ({ ...p, comment: e.target.value }))
              }
            />
          </div>
          <button
            type="submit"
            disabled={orderMutation.isPending || !isValid}
            className="aurora-button w-full rounded-full py-4 text-base font-medium transition-transform hover:scale-[1.01] disabled:opacity-40"
          >
            {orderMutation.isPending ? "Оформляем..." : "Подтвердить заказ"}
          </button>
        </form>
      </div>
    </div>
  );
}
