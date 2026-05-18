import { Link } from "react-router-dom";
import { ShoppingCart, Heart, Minus, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { formatPrice } from "../lib/format";
import MediaImage from "./MediaImage";
import { useAuthStore } from "../store/authStore";
import { isCustomer } from "../lib/roles";

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

export default function ProductCard({ product }: { product: Product }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const avgRating = product.reviews?.length
    ? (
        product.reviews.reduce((s, r) => s + r.rating, 0) /
        product.reviews.length
      ).toFixed(1)
    : null;

  const canShop = isCustomer(user);

  const { data: cartItems = [] } = useQuery({
    queryKey: ["cart"],
    queryFn: () => api.get("/cart").then((r) => r.data),
    enabled: canShop,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => api.get("/favorites").then((r) => r.data),
    enabled: canShop,
  });

  const cartItem = (cartItems as any[]).find((i) => i.productId === product.id);
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
    if (!canShop) return;
    toggleFavoriteMutation.mutate();
  };
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

  return (
    <Link
      to={`/catalog/${product.slug}`}
      className="ns-card group flex min-h-0 w-full min-w-0 flex-col overflow-hidden md:min-h-[380px]"
    >
      <div className="ns-card-media relative flex aspect-[4/3] w-full shrink-0 items-center justify-center overflow-hidden max-md:aspect-square">
        {product.imageUrl ? (
          <MediaImage
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-contain object-center p-2 sm:p-3"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ns-muted text-4xl">
            📦
          </div>
        )}

        {canShop && (
          <div className="absolute top-0 left-0 right-0 flex items-start justify-end p-3">
            <button
              onClick={handleFavorite}
              className="ns-icon-round p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            >
              <Heart
                size={14}
                strokeWidth={1.5}
                className={
                  isFavorite ? "fill-ns-error text-ns-error" : "text-ns-text"
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

      <div className="flex min-h-0 flex-1 flex-col p-2.5 sm:p-4">
        <span className="ns-caption mb-1 mt-1 block truncate uppercase tracking-wider text-[10px] sm:mb-4 sm:mt-4 sm:text-xs">
          {product.brand.name}
        </span>
        <p className="ns-heading-card mb-1 line-clamp-2 text-sm leading-snug sm:mb-2 sm:text-base">
          {product.name}
        </p>

        <div className="mb-auto h-[4.5rem] space-y-1.5 overflow-hidden hidden md:block">
          {product.specs && Object.keys(product.specs).length > 0 && (
            <>
              {Object.entries(product.specs as Record<string, string>)
                .slice(0, 3)
                .map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-start gap-1.5 text-[10px] leading-tight"
                  >
                    <span className="text-ns-muted shrink-0">{key}:</span>
                    <span className="text-ns-text-secondary font-medium line-clamp-1">
                      {value}
                    </span>
                  </div>
                ))}
            </>
          )}
        </div>

        <div className="mt-auto pt-2 sm:mt-4 sm:pt-3">
          <div className="mb-2 flex items-center justify-center sm:mb-3">
            <span className="text-sm font-semibold text-ns-text sm:text-lg">
              {formatPrice(product.price)}
            </span>
          </div>

          {canShop && cartItem ? (
            <div
              className="flex items-center justify-center gap-2"
              onClick={(e) => e.preventDefault()}
            >
              <button
                onClick={(e) => handleUpdateCart(e, cartItem.quantity - 1)}
                className="ns-icon-round w-9 h-9 shrink-0"
              >
                <Minus size={14} strokeWidth={2} />
              </button>
              <span className="min-w-[2rem] text-center text-sm font-semibold text-ns-text">
                {cartItem.quantity}
              </span>
              <button
                onClick={(e) => handleUpdateCart(e, cartItem.quantity + 1)}
                className="ns-icon-round w-9 h-9 shrink-0"
              >
                <Plus size={14} strokeWidth={2} />
              </button>
            </div>
          ) : canShop ? (
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="ns-btn ns-btn-primary w-full text-xs disabled:opacity-30"
            >
              <ShoppingCart size={14} strokeWidth={1.5} />
              <span>Купить</span>
            </button>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
