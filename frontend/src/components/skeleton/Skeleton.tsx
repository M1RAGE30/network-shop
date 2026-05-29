import type { HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`ns-skeleton ${className}`.trim()}
      aria-hidden
      {...props}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div
      className="ns-card flex min-h-0 w-full min-w-0 flex-col overflow-hidden md:min-h-[380px]"
      aria-hidden
    >
      <div className="ns-card-media relative flex aspect-[4/3] w-full shrink-0 overflow-hidden max-md:aspect-square">
        <Skeleton className="h-full w-full rounded-none" />
        <Skeleton className="absolute top-3 right-3 h-11 w-11 rounded-full md:opacity-0" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-2.5 sm:p-4 text-left">
        <Skeleton className="mb-1 mt-1 h-3 w-1/3 md:mb-2 md:mt-2" />
        <Skeleton className="mb-1 h-4 w-full md:mb-2 md:h-5" />
        <Skeleton className="mb-1 hidden h-4 w-4/5 md:block" />
        <div className="mb-2 hidden min-h-[3.25rem] space-y-1 md:block">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
        </div>
        <div className="mt-auto pt-2 md:pt-1">
          <div className="mb-2 flex justify-center">
            <Skeleton className="h-5 w-24 sm:h-6" />
          </div>
          <Skeleton className="h-10 w-full rounded-[var(--radius-btn)]" />
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeletonGrid({
  count = 8,
  className = "ns-product-grid",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className} aria-busy="true" aria-label="Загрузка каталога">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductPageSkeleton() {
  return (
    <div
      className="max-w-6xl mx-auto w-full"
      aria-busy="true"
      aria-label="Загрузка товара"
    >
      <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
        <Skeleton className="aspect-square w-full rounded-3xl" />
        <div className="space-y-4 sm:space-y-5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-btn)]" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="aurora-card rounded-2xl px-4 py-4 sm:px-5 sm:py-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-5 w-20 shrink-0" />
        <Skeleton className="h-5 w-5 shrink-0 rounded" />
      </div>
    </div>
  );
}

export function OrderListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className="space-y-3 sm:space-y-4"
      aria-busy="true"
      aria-label="Загрузка заказов"
    >
      {Array.from({ length: count }).map((_, i) => (
        <OrderCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CartItemSkeleton() {
  return (
    <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl ns-chip">
      <Skeleton className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <Skeleton className="h-9 w-24 shrink-0 rounded-[var(--radius-btn)]" />
    </div>
  );
}

export function CartPageSkeleton() {
  return (
    <div className="w-full min-w-0 mx-auto py-6 sm:py-8" aria-busy="true">
      <Skeleton className="h-9 w-32 mb-4 sm:mb-5" />
      <div className="ns-cart-layout">
        <div className="aurora-card rounded-2xl p-4 sm:p-5 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CartItemSkeleton key={i} />
          ))}
        </div>
        <div className="aurora-card rounded-2xl p-4 sm:p-5 space-y-4 h-fit">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-btn)]" />
        </div>
      </div>
    </div>
  );
}

export function CheckoutPageSkeleton() {
  return (
    <div className="w-full min-w-0 mx-auto py-6 sm:py-8" aria-busy="true">
      <Skeleton className="h-9 w-48 mb-6" />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="aurora-card rounded-2xl p-5 space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full rounded-[var(--radius-btn)]" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full rounded-[var(--radius-btn)]" />
          <Skeleton className="h-24 w-full rounded-[var(--radius-btn)]" />
        </div>
        <div className="aurora-card rounded-2xl p-5 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <CartItemSkeleton key={i} />
          ))}
          <Skeleton className="h-12 w-full rounded-[var(--radius-btn)] mt-4" />
        </div>
      </div>
    </div>
  );
}

export function AdminMetricSkeleton() {
  return (
    <div className="ns-card-static flex flex-col gap-3 p-4 sm:p-5 xl:p-6 min-w-0">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-8 rounded-[var(--radius-btn)]" />
      </div>
      <Skeleton className="h-9 w-24" />
    </div>
  );
}

export function AdminStatsSkeleton() {
  return (
    <div
      className="flex min-h-0 w-full flex-1 flex-col space-y-4 sm:space-y-5 xl:space-y-6"
      aria-busy="true"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 xl:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <AdminMetricSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 xl:gap-5">
        <div className="ns-card-static flex min-h-[220px] flex-col p-4 sm:p-5 xl:p-6 space-y-3">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-3">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-5 w-8" />
            </div>
          ))}
        </div>
        <div className="ns-card-static flex min-h-[220px] flex-col p-4 sm:p-5 xl:p-6 space-y-3">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminTableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className={`h-4 ${i === 0 ? "w-40" : "w-16 ml-auto"}`} />
        </td>
      ))}
    </tr>
  );
}

export function AdminProductsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="aurora-card rounded-3xl overflow-hidden" aria-busy="true">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="ns-table-head">
            <tr>
              {["Товар", "Категория", "Цена", "Остаток", ""].map((h) => (
                <th
                  key={h}
                  className={`px-6 py-4 text-xs font-semibold text-ns-text ${h === "Цена" || h === "Остаток" ? "text-right" : "text-left"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ns-border">
            {Array.from({ length: rows }).map((_, i) => (
              <AdminTableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden divide-y divide-ns-border p-3 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-3 py-2">
            <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminUsersListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="aurora-card rounded-3xl overflow-hidden divide-y divide-ns-border" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-9 w-24 rounded-[var(--radius-btn)]" />
        </div>
      ))}
    </div>
  );
}

export function ChatPanelSkeleton() {
  return (
    <div
      className="aurora-card flex flex-col overflow-hidden border border-ns-border"
      style={{
        height: "min(560px, calc(100dvh - 12rem))",
        minHeight: "min(500px, calc(100dvh - 10rem))",
      }}
      aria-busy="true"
    >
      <div className="px-5 py-4 border-b border-ns-border">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex-1 px-5 py-6 space-y-4">
        <Skeleton className="h-12 w-3/5 rounded-2xl" />
        <Skeleton className="h-12 w-2/5 ml-auto rounded-2xl" />
        <Skeleton className="h-12 w-1/2 rounded-2xl" />
      </div>
      <div className="px-5 py-4 border-t border-ns-border">
        <Skeleton className="h-11 w-full rounded-[var(--radius-btn)]" />
      </div>
    </div>
  );
}

export function AdminChatListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="aurora-card rounded-xl px-4 py-3 flex gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageRouteSkeleton() {
  return (
    <div
      className="w-full max-w-6xl mx-auto py-8 sm:py-10 space-y-6 px-1"
      aria-busy="true"
      aria-label="Загрузка страницы"
    >
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="grid sm:grid-cols-2 gap-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}
