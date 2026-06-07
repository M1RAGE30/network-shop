import { ChevronDown } from "lucide-react";
import { Price } from "./Price";
import {
  formatOrderDate,
  orderStatusBadgeClass,
  orderStatusLabels,
} from "../lib/orderStatus";

interface OrderCardSummaryProps {
  orderId: number;
  status: string;
  createdAt: string;
  totalAmount: number | string;
  subtitle?: string;
  isOpen: boolean;
}

export default function OrderCardSummary({
  orderId,
  status,
  createdAt,
  totalAmount,
  subtitle,
  isOpen,
}: OrderCardSummaryProps) {
  return (
    <div className="flex w-full items-center gap-3 sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-ns-text tabular-nums">
            Заказ #{orderId}
          </span>
          <span
            className={
              orderStatusBadgeClass[status] ?? "ns-badge ns-badge--muted"
            }
          >
            {orderStatusLabels[status] ?? status}
          </span>
        </div>
        <p className="text-sm sm:text-xs text-ns-muted mt-1 line-clamp-2">
          {subtitle ? `${subtitle} · ` : ""}
          {formatOrderDate(createdAt)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        <span className="text-base sm:text-base font-semibold text-ns-text tabular-nums whitespace-nowrap">
          <Price value={totalAmount} />
        </span>
        <span
          className="inline-flex h-9 w-9 items-center justify-center text-ns-muted"
          aria-hidden
        >
          <ChevronDown
            size={20}
            strokeWidth={2}
            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </span>
      </div>
    </div>
  );
}
