import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { formatPrice } from "../lib/format";
import {
  ShoppingCart,
  Heart,
  Star,
  Minus,
  Plus,
  Package,
  BookOpen,
} from "lucide-react";
import RouterSetupGuideSection from "../components/RouterSetupGuideSection";
import { isRouterProduct } from "../lib/routerSetupGuides";
import { useAuthStore } from "../store/authStore";
import { isAdmin, isCustomer } from "../lib/roles";
import { useState } from "react";
import { pluralizeReviews } from "../lib/pluralize";
import MediaImage from "../components/MediaImage";
import { ProductPageSkeleton } from "../components/skeleton/Skeleton";
import { textareaCls } from "../lib/uiClasses";

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => api.get(`/products/${slug}`).then((r) => r.data),
  });

  const admin = isAdmin(user);
  const canShop = isCustomer(user);
  const shopLocked = admin;

  const { data: cartItems = [] } = useQuery({
    queryKey: ["cart"],
    queryFn: () => api.get("/cart").then((r) => r.data),
    enabled: canShop,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => api.get("/favorites").then((r) => r.data),
    enabled: !!user && !admin,
  });

  const cartItem = product
    ? (cartItems as any[]).find((i) => i.productId === product.id)
    : null;
  const atStockLimit =
    !!product && !!cartItem && cartItem.quantity >= product.stock;
  const isFavorite = product
    ? (favorites as any[]).some((f) => f.productId === product.id)
    : false;

  const addToCartMutation = useMutation({
    mutationFn: () => api.post("/cart", { productId: product.id, quantity: 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });

  const updateCartMutation = useMutation({
    mutationFn: (quantity: number) =>
      quantity === 0
        ? api.delete(`/cart/${product.id}`)
        : api.put(`/cart/${product.id}`, { quantity }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: () =>
      isFavorite
        ? api.delete(`/favorites/${product.id}`)
        : api.post(`/favorites/${product.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });

  const addReview = useMutation({
    mutationFn: () =>
      api.post(`/reviews/product/${product.id}`, { rating, comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", slug] });
      setComment("");
    },
  });

  if (isLoading) {
    return <ProductPageSkeleton />;
  }

  if (!product)
    return (
      <p className="text-ns-muted py-20 text-center text-lg">
        Товар не найден
      </p>
    );

  const avgRating = product.reviews.length
    ? (
        product.reviews.reduce((s: number, r: any) => s + r.rating, 0) /
        product.reviews.length
      ).toFixed(1)
    : null;

  const isRouter = isRouterProduct(product.category);
  const activeTab =
    location.hash === "#reviews"
      ? "reviews"
      : location.hash === "#setup" && isRouter
        ? "setup"
        : "specs";

  return (
    <div className="max-w-[1280px] mx-auto space-y-7 sm:space-y-9 px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
      <nav aria-label="Хлебные крошки" className="mb-2">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ns-muted">
          <li>
            <Link to="/" className="hover:text-ns-text transition-colors">
              Главная
            </Link>
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden>/</span>
            <Link to="/catalog" className="hover:text-ns-text transition-colors">
              Каталог
            </Link>
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden>/</span>
            <span className="text-ns-text">{product.name}</span>
          </li>
        </ol>
      </nav>
      <section className="aurora-panel rounded-[2.25rem] p-5 sm:p-7 lg:p-10">
        <div className="grid lg:grid-cols-[minmax(220px,400px)_minmax(0,1fr)] gap-7 lg:gap-12 items-center">
          <div className="relative flex min-h-[250px] sm:min-h-[320px] lg:min-h-[390px] items-center justify-center overflow-hidden rounded-[1.5rem] bg-ns-elevated">
            {product.imageUrl ? (
              <MediaImage
                src={product.imageUrl}
                alt={product.name}
                className="relative z-10 h-full w-full max-h-[400px] rounded-[1.5rem] object-cover object-center"
              />
            ) : (
              <div className="relative z-10 flex h-56 w-56 items-center justify-center rounded-[2rem] ns-chip">
                <Package
                  size={88}
                  strokeWidth={1.1}
                  className="text-ns-muted"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center space-y-5 lg:pl-2">
          <div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-ns-text leading-tight tracking-tight mb-4">
              {product.name}
            </h1>
          </div>

          {avgRating && (
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={16}
                    strokeWidth={1.5}
                    className={
                      Number(avgRating) >= s
                        ? "ns-star"
                        : "text-ns-muted"
                    }
                  />
                ))}
              </div>
              <span className="text-sm text-ns-text-secondary">
                {avgRating} · {pluralizeReviews(product.reviews.length)}
              </span>
            </div>
          )}

          <div className="py-2">
            <p className="aurora-text text-4xl sm:text-5xl font-semibold">
              {formatPrice(product.price)}
            </p>
          </div>

          {product.description && (
            <p className="max-w-2xl text-base text-ns-text-secondary leading-relaxed">
              {product.description}
            </p>
          )}

          {isRouter && (
            <button
              type="button"
              onClick={() => navigate({ hash: "setup" }, { replace: true })}
              className="ns-btn ns-btn-secondary w-full sm:w-auto inline-flex items-center justify-center gap-2"
            >
              <BookOpen size={18} strokeWidth={1.75} />
              Инструкция по настройке
            </button>
          )}

          <div className="flex items-stretch gap-3 pt-3 sm:pt-4">
            {shopLocked ? (
              <button
                type="button"
                disabled
                className="aurora-button flex-1 min-w-0 min-h-[var(--ns-height-btn)] flex items-center justify-center gap-2 text-sm font-medium opacity-45 cursor-not-allowed"
              >
                <ShoppingCart size={18} strokeWidth={1.5} className="sm:w-5 sm:h-5" />
                В корзину
              </button>
            ) : canShop && cartItem ? (
              <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                <button
                  onClick={() =>
                    updateCartMutation.mutate(cartItem.quantity - 1)
                  }
                  className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-[var(--radius-btn)] border border-ns-border bg-ns-elevated hover:bg-ns-hover transition-colors text-ns-text cursor-pointer"
                >
                  <Minus
                    size={16}
                    strokeWidth={1.5}
                    className="sm:w-[18px] sm:h-[18px]"
                  />
                </button>
                <span className="text-lg sm:text-xl font-semibold w-8 sm:w-10 text-center text-ns-text">
                  {cartItem.quantity}
                </span>
                <button
                  type="button"
                  disabled={atStockLimit}
                  onClick={() =>
                    updateCartMutation.mutate(cartItem.quantity + 1)
                  }
                  className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-[var(--radius-btn)] border border-ns-border bg-ns-elevated hover:bg-ns-hover transition-colors text-ns-text cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-ns-elevated"
                >
                  <Plus
                    size={16}
                    strokeWidth={1.5}
                    className="sm:w-[18px] sm:h-[18px]"
                  />
                </button>
                <span className="text-xs sm:text-sm text-ns-text-secondary whitespace-nowrap">
                  в корзине
                </span>
              </div>
            ) : canShop ? (
              <button
                onClick={() => addToCartMutation.mutate()}
                className="aurora-button flex-1 min-w-0 min-h-[var(--ns-height-btn)] flex items-center justify-center gap-2 text-sm font-medium transition-transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <ShoppingCart
                  size={18}
                  strokeWidth={1.5}
                  className="sm:w-5 sm:h-5"
                />{" "}
                В корзину
              </button>
            ) : !user ? (
              <Link
                to="/login"
                className="aurora-button flex-1 min-w-0 flex items-center justify-center gap-2 text-sm font-medium transition-transform hover:scale-[1.01] active:scale-[0.99]"
              >
                Войти, чтобы добавить в корзину
              </Link>
            ) : null}

            {!admin && (
              <button
                type="button"
                onClick={() => {
                  if (shopLocked) return;
                  if (!user) {
                    navigate("/login");
                    return;
                  }
                  toggleFavoriteMutation.mutate();
                }}
                disabled={shopLocked}
                className={`ns-icon-round flex h-[var(--ns-height-btn)] w-[var(--ns-height-btn)] shrink-0 items-center justify-center ${
                  shopLocked ? "cursor-not-allowed opacity-45" : ""
                }`}
                aria-label={
                  isFavorite ? "Убрать из избранного" : "Добавить в избранное"
                }
                title={isFavorite ? "В избранном" : "Добавить в избранное"}
              >
                <Heart
                  size={20}
                  strokeWidth={2}
                  className={
                    isFavorite
                      ? "fill-ns-error text-ns-error"
                      : "fill-none text-ns-text"
                  }
                  aria-hidden
                />
              </button>
            )}
          </div>
        </div>
        </div>
      </section>

      <nav className="flex flex-wrap items-center gap-3" aria-label="Разделы товара">
        <button
          type="button"
          onClick={() => navigate({ hash: "" }, { replace: true })}
          className={`ns-tab-btn ${activeTab === "specs" ? "ns-tab-btn--active" : ""}`}
        >
          Характеристики
        </button>
        <button
          type="button"
          onClick={() => navigate({ hash: "reviews" }, { replace: true })}
          className={`ns-tab-btn ${activeTab === "reviews" ? "ns-tab-btn--active" : ""}`}
        >
          Отзывы
        </button>
        {isRouter && (
          <button
            type="button"
            onClick={() => navigate({ hash: "setup" }, { replace: true })}
            className={`ns-tab-btn ${activeTab === "setup" ? "ns-tab-btn--active" : ""}`}
          >
            Настройка
          </button>
        )}
      </nav>

      {activeTab === "reviews" && (
        <section className="rounded-[2rem] px-1 sm:px-2">
        <h2 className="text-xl sm:text-2xl font-semibold text-ns-text mb-6 sm:mb-8">
          Отзывы{" "}
          {product.reviews.length > 0 && (
            <span className="text-ns-muted font-normal text-base sm:text-lg">
              ({product.reviews.length})
            </span>
          )}
        </h2>

        {canShop && (
          <div className="mb-8 ns-chip rounded-2xl p-5 sm:p-6">
            <p className="text-sm font-semibold text-ns-text mb-4">
              Оставить отзыв
            </p>
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star
                    size={28}
                    strokeWidth={1.5}
                    className={
                      s <= rating
                        ? "ns-star"
                        : "text-ns-muted"
                    }
                  />
                </button>
              ))}
            </div>
            <textarea
              rows={4}
              placeholder="Расскажите о товаре..."
              className={textareaCls}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button
              onClick={() => addReview.mutate()}
              disabled={!comment.trim() || addReview.isPending}
              className="aurora-button mt-4 px-6 text-sm font-medium transition-transform hover:scale-[1.01] disabled:opacity-30"
            >
              Опубликовать
            </button>
          </div>
        )}

        {product.reviews.length === 0 ? (
          <p className="text-sm text-ns-muted">
            Отзывов пока нет. Будьте первым.
          </p>
        ) : (
          <div className="space-y-4">
            {product.reviews.map((r: any) => (
              <div
                key={r.id}
                className="ns-chip rounded-2xl p-5 sm:p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-ns-text">
                    {r.user.name}
                  </span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        strokeWidth={1.5}
                        className={
                          r.rating >= s
                            ? "ns-star"
                            : "text-ns-muted"
                        }
                      />
                    ))}
                  </div>
                </div>
                {r.comment && (
                  <p className="text-sm text-ns-muted leading-relaxed">
                    {r.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        </section>
      )}

      {activeTab === "setup" && isRouter && (
        <RouterSetupGuideSection
          product={{
            name: product.name,
            slug: product.slug,
            brand: product.brand,
            specs: product.specs as Record<string, string> | null,
          }}
        />
      )}

      {activeTab === "specs" && product.specs && (
        <section className="rounded-[2rem] px-1 sm:px-2">
          <h2 className="text-xl sm:text-2xl font-semibold text-ns-text mb-6 sm:mb-8">
            Характеристики
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {Object.entries(product.specs as Record<string, string>)
              .filter(([key]) => !key.startsWith("_"))
              .map(
              ([k, v], index) => (
                <div
                  key={k}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-4 rounded-2xl ${
                    index % 2 === 0
                      ? "ns-chip"
                      : "bg-ns-hover"
                  }`}
                >
                  <span className="text-sm font-medium text-ns-muted">
                    {k}
                  </span>
                  <span className="text-sm font-semibold text-ns-text sm:text-right">
                    {v}
                  </span>
                </div>
              ),
            )}
          </div>
        </section>
      )}
    </div>
  );
}
