import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Heart, Minus, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { Price } from "./Price";
import MediaImage from "./MediaImage";
import { useAuthStore } from "../store/authStore";
import { isAdmin, isCustomer } from "../lib/roles";

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  brand: { name: string };
  category: { name: string };
  reviews: { rating: number }[];
  specs?: Record<string, string> | null;
}

interface ProductCardProps {
  product: Product;
  favoriteControl?: "toggle" | "none";
  className?: string;
}

export default function ProductCard({
  product,
  favoriteControl = "toggle",
  className = "",
}: ProductCardProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const avgRating = product.reviews?.length
    ? (
        product.reviews.reduce((s, r) => s + r.rating, 0) /
        product.reviews.length
      ).toFixed(1)
    : null;

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

  const cartItem = (cartItems as any[]).find((i) => i.productId === product.id);
  const atStockLimit = !!cartItem && cartItem.quantity >= product.stock;
  const isFavorite = (favorites as any[]).some(
    (f) => f.productId === product.id,
  );

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

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (shopLocked) return;
    if (!user) {
      navigate("/login");
      return;
    }
    toggleFavoriteMutation.mutate();
  };

  const showFavoriteToggle = !admin && favoriteControl === "toggle";
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return;
    addToCartMutation.mutate();
  };
  const handleUpdateCart = (e: React.MouseEvent, quantity: number) => {
    e.preventDefault();
    updateCartMutation.mutate(quantity);
  };

  const isLowStock = product.stock > 0 && product.stock <= 5;
  const isOutOfStock = product.stock === 0;

  const cardSpecs = product.specs
    ? Object.entries(product.specs as Record<string, string>)
        .filter(([key]) => key !== "Бренд")
        .slice(0, 3)
    : [];

  return (
    <Link
      to={`/catalog/${product.slug}`}
      className={`ns-card group flex min-h-0 w-full min-w-0 flex-col overflow-hidden md:min-h-[380px] ${className}`.trim()}
    >
      <div className="ns-card-media relative aspect-square w-full shrink-0 overflow-hidden">
        {product.imageUrl ? (
          <MediaImage
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ns-muted text-4xl">
            📦
          </div>
        )}

        {showFavoriteToggle && (
          <div className="ns-card-fav absolute top-3 right-3 z-10">
            <button
              type="button"
              onClick={(e) => {
                handleFavorite(e);
                e.currentTarget.blur();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              disabled={shopLocked}
              className={`ns-icon-round ns-fav-btn min-h-11 min-w-11 p-2.5 shadow-sm touch-manipulation ${
                shopLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              }`}
              aria-label={
                isFavorite ? "Убрать из избранного" : "Добавить в избранное"
              }
            >
              <Heart
                size={16}
                strokeWidth={1.75}
                className={
                  isFavorite
                    ? "fill-ns-error text-ns-error"
                    : "fill-transparent text-ns-icon"
                }
              />
            </button>
          </div>
        )}

        {avgRating && (
          <div className="absolute bottom-3 left-3 ns-badge ns-badge--accent">
            ★ {avgRating}
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 ns-overlay-scrim flex items-center justify-center">
            <span className="ns-badge ns-badge--muted">Нет в наличии</span>
          </div>
        )}
        {isLowStock && !isOutOfStock && (
          <div className="absolute bottom-3 right-3 ns-badge ns-badge--danger">
            Осталось {product.stock}
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2 text-left sm:px-4 sm:pb-4 sm:pt-2.5">
        <span className="ns-caption mb-1 block truncate uppercase tracking-wider text-xs md:mb-1.5">
          {product.brand.name}
        </span>
        <p className="ns-heading-card mb-1.5 line-clamp-2 min-h-[2.75em] text-sm leading-snug md:mb-2 md:text-base">
          {product.name}
        </p>

        <div className="mb-2 hidden min-h-[3.5rem] space-y-1.5 overflow-hidden md:block">
          {cardSpecs.map(([key, value]) => (
            <div
              key={key}
              className="flex min-w-0 items-start gap-1 text-xs leading-tight lg:text-[13px]"
            >
              <span className="max-w-[42%] shrink-0 truncate text-ns-muted">
                {key}:
              </span>
              <span className="min-w-0 flex-1 text-ns-text-secondary font-medium line-clamp-1">
                {value}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-2.5 md:pt-2">
          <div className="mb-2 flex items-center justify-center">
            <span className="text-base font-semibold text-ns-text sm:text-lg">
              <Price value={product.price} />
            </span>
          </div>

          {shopLocked ? (
            <button
              type="button"
              disabled
              className="ns-btn ns-btn-primary w-full text-xs opacity-60 cursor-not-allowed"
              onClick={(e) => e.preventDefault()}
            >
              <ShoppingCart size={14} strokeWidth={1.5} />
              <span>В корзину</span>
            </button>
          ) : canShop && cartItem ? (
            <div
              className="flex min-h-[var(--ns-height-btn)] items-center justify-center gap-2"
              onClick={(e) => e.preventDefault()}
            >
              <button
                type="button"
                onClick={(e) => handleUpdateCart(e, cartItem.quantity - 1)}
                className="ns-icon-round flex h-[var(--ns-height-btn)] w-[var(--ns-height-btn)] shrink-0 items-center justify-center"
              >
                <Minus size={14} strokeWidth={2} />
              </button>
              <span className="inline-flex h-[var(--ns-height-btn)] min-w-[2rem] items-center justify-center text-sm font-semibold tabular-nums text-ns-text">
                {cartItem.quantity}
              </span>
              <button
                type="button"
                disabled={atStockLimit}
                onClick={(e) => handleUpdateCart(e, cartItem.quantity + 1)}
                className="ns-icon-round flex h-[var(--ns-height-btn)] w-[var(--ns-height-btn)] shrink-0 items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} strokeWidth={2} />
              </button>
            </div>
          ) : canShop ? (
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="ns-btn ns-btn-primary w-full text-xs disabled:opacity-50"
            >
              <ShoppingCart size={14} strokeWidth={1.5} />
              <span>В корзину</span>
            </button>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
