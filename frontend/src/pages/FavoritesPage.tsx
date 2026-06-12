import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { Heart } from "lucide-react";
import { pluralizeProducts } from "../lib/pluralize";
import ProductCard from "../components/ProductCard";
import {
  ProductCardSkeletonGrid,
  Skeleton,
} from "../components/skeleton/Skeleton";

export default function FavoritesPage() {
  const qc = useQueryClient();
  const { data: favs = [], isPending } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => api.get("/favorites").then((r) => r.data),
  });

  const removeMutation = useMutation({
    mutationFn: (productId: number) => api.delete(`/favorites/${productId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });

  if (isPending) {
    return (
      <div className="w-full min-w-0 mx-auto py-6 sm:py-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <ProductCardSkeletonGrid
          count={6}
          className="ns-favorites-grid"
        />
      </div>
    );
  }

  if (!favs.length) {
    return (
      <div className="ns-page-empty">
        <Heart strokeWidth={1} className="ns-page-empty__icon" />
        <p className="text-lg text-ns-muted">
          Избранное пусто
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 mx-auto py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 pb-4">
        <h1 className="ns-heading-page">
          Избранное
        </h1>
        <p className="text-sm text-ns-muted">
          {pluralizeProducts(favs.length)}
        </p>
      </div>
      <div className="ns-favorites-grid">
        {favs.map((fav: any) => (
          <div key={fav.id} className="flex h-full min-h-0 flex-col gap-2">
            <ProductCard
              product={fav.product}
              favoriteControl="none"
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => removeMutation.mutate(fav.productId)}
              disabled={removeMutation.isPending}
              className="ns-btn ns-btn-secondary w-full text-sm"
            >
              Удалить из избранного
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
