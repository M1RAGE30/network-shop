export const orderStatusLabels: Record<string, string> = {
  PENDING: "Ожидает",
  CONFIRMED: "Подтверждён",
  SHIPPED: "Отправлен",
  DELIVERED: "Доставлен",
  CANCELLED: "Отменён",
};

export const orderStatusBadgeClass: Record<string, string> = {
  PENDING: "ns-badge ns-badge--order-warning",
  CONFIRMED: "ns-badge ns-badge--order-neutral",
  SHIPPED: "ns-badge ns-badge--order-neutral",
  DELIVERED: "ns-badge ns-badge--order-success",
  CANCELLED: "ns-badge ns-badge--danger",
};

export function formatOrderDate(value: string) {
  return new Date(value).toLocaleDateString("ru-BY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
