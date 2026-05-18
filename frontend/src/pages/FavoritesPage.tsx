import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import { Heart } from "lucide-react";
import { pluralizeProducts } from "../lib/pluralize";
import ProductCard from "../components/ProductCard";

export default function FavoritesPage() {
  const { data: favs = [] } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => api.get("/favorites").then((r) => r.data),
  });

  if (!favs.length) {
    return (
      <div className="text-center py-24">
        <Heart
          size={64}
          strokeWidth={1}
          className="mx-auto text-ns-muted mb-4"
        />
        <p className="text-lg text-ns-muted">
          Избранное пусто
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 mx-auto py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 pb-6">
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-ns-text tracking-tight">
          Избранное
        </h1>
        <p className="text-sm text-ns-muted">
          {pluralizeProducts(favs.length)}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {favs.map((fav: any) => (
          <div key={fav.id} className="w-full">
            <ProductCard product={fav.product} />
          </div>
        ))}
      </div>
    </div>
  );
}
