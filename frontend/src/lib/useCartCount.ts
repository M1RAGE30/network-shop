import { useQuery } from "@tanstack/react-query";
import api from "./api";
import { isAdmin } from "./roles";
import { useAuthStore } from "../store/authStore";

export function useCartCount() {
  const { user } = useAuthStore();
  const { data: items = [] } = useQuery({
    queryKey: ["cart"],
    queryFn: () => api.get("/cart").then((r) => r.data),
    enabled: !!user && !isAdmin(user),
  });
  return (items as { quantity: number }[]).reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
}
