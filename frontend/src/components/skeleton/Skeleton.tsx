import type { HTMLAttributes } from "react";
import {
  authCard,
  authFooter,
  authForm,
  authHeader,
  authPageWrap,
} from "../../lib/authFormStyles";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

function SkeletonPageTitle({ className = "w-40" }: { className?: string }) {
  return <Skeleton className={`h-7 sm:h-8 xl:h-10 ${className}`} />;
}

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
      <div className="ns-card-media relative aspect-square w-full shrink-0 overflow-hidden">
        <Skeleton className="h-full w-full rounded-none" />
        <Skeleton className="absolute top-3 right-3 h-11 w-11 rounded-full md:opacity-0" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-2.5 pt-1.5 text-left sm:px-4 sm:pb-4 sm:pt-2">
        <Skeleton className="mb-1 h-3 w-1/3 md:mb-1.5" />
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
      className="w-full min-w-0 space-y-5 sm:space-y-7 py-6 sm:py-8"
      aria-busy="true"
      aria-label="Загрузка товара"
    >
      <nav aria-hidden className="mb-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-1" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-1" />
          <Skeleton className="h-3 w-32 max-w-[40vw]" />
        </div>
      </nav>
      <section className="aurora-panel rounded-[2.25rem] p-4 sm:p-6 lg:p-8">
        <div className="grid lg:grid-cols-[minmax(220px,400px)_minmax(0,1fr)] gap-6 lg:gap-10 items-center">
          <div className="relative flex min-h-[250px] sm:min-h-[320px] lg:min-h-[390px] items-center justify-center overflow-hidden rounded-[1.5rem] bg-ns-elevated">
            <Skeleton className="h-full w-full max-h-[400px] rounded-[1.5rem]" />
          </div>
          <div className="flex flex-col justify-center space-y-5 lg:pl-2">
            <Skeleton className="h-9 sm:h-10 lg:h-12 w-full max-w-lg" />
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-4 rounded-sm" />
              ))}
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-10 sm:h-12 w-36" />
            <div className="space-y-2 max-w-2xl">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <div className="flex items-stretch gap-3 pt-3 sm:pt-4">
              <Skeleton className="h-[var(--ns-height-btn)] flex-1 min-w-0 rounded-[var(--radius-btn)]" />
              <Skeleton className="h-[var(--ns-height-btn)] w-[var(--ns-height-btn)] shrink-0 rounded-full" />
            </div>
          </div>
        </div>
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-[var(--ns-height-btn)] w-36 rounded-[var(--radius-btn)]" />
        <Skeleton className="h-[var(--ns-height-btn)] w-24 rounded-[var(--radius-btn)]" />
      </div>
      <div className="rounded-[2rem] px-1 sm:px-2 space-y-4">
        <Skeleton className="h-7 sm:h-8 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-4 py-2">
              <Skeleton className="h-4 w-1/3 max-w-[12rem]" />
              <Skeleton className="h-4 w-1/4 max-w-[8rem]" />
            </div>
          ))}
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

export function CheckoutItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl ns-chip">
      <Skeleton className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-full max-w-[14rem]" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}

export function CartItemSkeleton() {
  return (
    <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl ns-chip">
      <div className="flex flex-1 min-w-0 gap-3 sm:gap-4">
        <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-full max-w-[14rem]" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-24 mt-0.5" />
        </div>
      </div>
      <div className="flex flex-col items-end justify-between gap-2 shrink-0">
        <Skeleton className="h-8 w-8 rounded-[var(--radius-btn)]" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-8 rounded-[var(--radius-btn)]" />
          <Skeleton className="h-8 w-7" />
          <Skeleton className="h-8 w-8 rounded-[var(--radius-btn)]" />
        </div>
      </div>
    </div>
  );
}

export function CartPageSkeleton() {
  return (
    <div className="w-full min-w-0 mx-auto py-6 sm:py-8" aria-busy="true">
      <SkeletonPageTitle className="w-32 mb-4 sm:mb-5" />
      <div className="ns-cart-layout">
        <div className="aurora-card rounded-2xl p-4 sm:p-5 md:max-h-[calc(100vh-12rem)] flex flex-col min-h-0 w-full min-w-0">
          <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1 -mr-1 scrollbar-thin">
            {Array.from({ length: 3 }).map((_, i) => (
              <CartItemSkeleton key={i} />
            ))}
          </div>
        </div>
        <div className="aurora-card rounded-2xl p-4 sm:p-5 h-fit">
          <Skeleton className="h-4 w-28 mb-3" />
          <Skeleton className="h-8 w-36 mb-5" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-btn)]" />
        </div>
      </div>
    </div>
  );
}

export function CheckoutPageSkeleton() {
  return (
    <div className="w-full min-w-0 mx-auto py-6 sm:py-8" aria-busy="true">
      <SkeletonPageTitle className="w-52 mb-4 sm:mb-5" />
      <div className="grid md:grid-cols-2 gap-5 lg:gap-6 items-start">
        <div className="aurora-card rounded-2xl p-4 sm:p-5 md:max-h-[calc(100vh-12rem)] flex flex-col">
          <Skeleton className="h-4 w-28 mb-3 shrink-0" />
          <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1 -mr-1 scrollbar-thin">
            {Array.from({ length: 3 }).map((_, i) => (
              <CheckoutItemSkeleton key={i} />
            ))}
          </div>
          <div className="flex justify-between items-center pt-4 mt-4 border-t border-ns-border shrink-0">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
        <form className="aurora-card rounded-2xl p-4 sm:p-5 space-y-4 h-fit">
          <Skeleton className="h-4 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-11 w-full rounded-[var(--radius-btn)]" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-11 w-full rounded-[var(--radius-btn)]" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-[5.5rem] w-full rounded-[var(--radius-btn)]" />
          </div>
          <Skeleton className="h-12 w-full rounded-[var(--radius-btn)]" />
        </form>
      </div>
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="relative ns-reduce-motion w-full" aria-busy="true">
      <section className="ns-container ns-hero-section ns-home-hero pb-10 sm:pb-16 md:pb-20 lg:pb-24">
        <div className="ns-home-hero__layout">
          <div className="ns-home-hero__copy flex flex-col gap-5 sm:gap-6 lg:gap-8">
            <Skeleton className="h-4 w-52 max-w-full" />
            <Skeleton className="h-[clamp(2rem,5vw,4rem)] xl:h-16 w-full max-w-xl" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-4/5 max-w-xl hidden sm:block" />
            <div className="ns-home-hero__actions pt-1 sm:pt-2 lg:pt-4">
              <Skeleton className="h-[var(--ns-height-btn)] w-full min-[420px]:w-36 rounded-[var(--radius-btn)]" />
              <Skeleton className="h-[var(--ns-height-btn)] w-full min-[420px]:w-44 rounded-[var(--radius-btn)]" />
            </div>
          </div>
          <div className="ns-hero-visual ns-home-hero__visual">
            <Skeleton className="w-full min-h-[280px] sm:min-h-[360px] lg:min-h-[500px] rounded-3xl" />
          </div>
        </div>
      </section>
      <section className="ns-container ns-section-y ns-home-why">
        <Skeleton className="h-7 sm:h-8 md:h-9 w-56 max-w-[80vw] mx-auto mb-6 sm:mb-8 md:mb-10" />
        <div className="ns-home-why__grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="ns-card flex flex-col ns-card-padding min-h-0 sm:min-h-[220px] lg:min-h-[240px]"
            >
              <Skeleton className="h-11 w-11 rounded-xl mb-4" />
              <Skeleton className="h-5 w-36 mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12 mt-1 flex-1" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CatalogCategoryPickerSkeleton() {
  return (
    <>
      <div className="sm:hidden mb-4">
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-10 w-full rounded-[var(--radius-btn)]" />
      </div>
      <nav className="hidden sm:block mb-6 min-w-0 max-w-full" aria-hidden>
        <Skeleton className="h-4 w-20 mb-2" />
        <div className="ns-category-rail__scroll">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-[34px] w-24 sm:w-28 shrink-0 rounded-[var(--radius-btn)]"
            />
          ))}
        </div>
      </nav>
    </>
  );
}

export function CatalogPageSkeleton() {
  return (
    <div className="py-6 sm:py-8 w-full min-w-0 mx-auto" aria-busy="true">
      <div className="mb-8 sm:mb-10">
        <SkeletonPageTitle className="w-72 max-w-full" />
      </div>
      <CatalogCategoryPickerSkeleton />
      <div className="ns-catalog-layout">
        <aside className="ns-catalog-filters">
          <div className="ns-catalog-filters-panel ns-card-static sticky top-24 rounded-[20px] p-5 xl:p-6 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-none">
            <div className="mx-auto w-full max-w-[260px] space-y-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full rounded-[var(--radius-btn)]" />
                </div>
              ))}
              <Skeleton className="h-10 w-full rounded-[var(--radius-btn)]" />
            </div>
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          <div className="flex gap-3 mb-6">
            <Skeleton className="min-h-[var(--ns-height-btn)] flex-1 rounded-[var(--radius-btn)]" />
            <Skeleton className="min-h-[var(--ns-height-btn)] w-28 lg:hidden rounded-[var(--radius-btn)] shrink-0" />
          </div>
          <div className="ns-catalog-toolbar mb-4">
            <Skeleton className="h-4 w-32 ns-catalog-toolbar__count" />
            <Skeleton className="ns-input ns-catalog-toolbar__sort !h-10 rounded-[var(--radius-btn)]" />
          </div>
          <ProductCardSkeletonGrid />
        </div>
      </div>
    </div>
  );
}

function FavoritesCardSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <ProductCardSkeleton />
      <Skeleton className="h-10 w-full rounded-[var(--radius-btn)]" />
    </div>
  );
}

export function FavoritesPageSkeleton() {
  return (
    <div className="w-full min-w-0 mx-auto py-6 sm:py-8 space-y-6" aria-busy="true">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 pb-4">
        <SkeletonPageTitle className="w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="ns-favorites-grid" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <FavoritesCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function OrdersPageSkeleton() {
  return (
    <div className="ns-page-narrow w-full min-w-0 py-6 sm:py-8" aria-busy="true">
      <SkeletonPageTitle className="w-40 mb-4 sm:mb-5" />
      <OrderListSkeleton />
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-xl pb-8 space-y-6" aria-busy="true">
      <div className="text-center">
        <SkeletonPageTitle className="w-32 mx-auto" />
      </div>
      <div className="aurora-card overflow-hidden">
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full shrink-0" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-10 w-full rounded-[var(--radius-btn)]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-[var(--radius-btn)]" />
              <Skeleton className="h-3 w-full max-w-[12rem]" />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full rounded-[var(--radius-btn)]" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Skeleton className="h-10 w-40 rounded-[var(--radius-btn)]" />
            <Skeleton className="h-10 w-44 rounded-[var(--radius-btn)]" />
          </div>
        </div>
        <section className="border-t border-ns-border p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-[var(--radius-btn)]" />
              <div className="space-y-2 min-w-0">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48 max-w-full" />
              </div>
            </div>
            <Skeleton className="h-10 w-full sm:w-40 rounded-[var(--radius-btn)] shrink-0" />
          </div>
        </section>
      </div>
    </div>
  );
}

export function AuthPageSkeleton() {
  return (
    <div className={authPageWrap} aria-busy="true">
      <div className={authCard}>
        <div className={authHeader}>
          <Skeleton className="h-9 w-48 mx-auto mb-3" />
          <Skeleton className="h-4 w-full max-w-xs mx-auto" />
        </div>
        <div className={authForm}>
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-11 w-full rounded-[var(--radius-btn)]" />
          </div>
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-11 w-full rounded-[var(--radius-btn)]" />
          </div>
          <Skeleton className="h-12 w-full rounded-[var(--radius-btn)] mt-3" />
          <p className={authFooter}>
            <Skeleton className="h-4 w-56 mx-auto" />
          </p>
        </div>
      </div>
    </div>
  );
}

export function NetworkBuilderPageSkeleton() {
  return (
    <div className="ns-net-builder w-full min-w-0 mx-auto pb-10" aria-busy="true">
      <div className="text-center mb-8">
        <Skeleton className="h-9 sm:h-10 w-64 max-w-[90vw] mx-auto" />
        <Skeleton className="h-4 w-80 max-w-full mx-auto mt-2" />
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] gap-4 lg:gap-5">
        <div className="space-y-4">
          <div className="aurora-card rounded-2xl p-4 sm:p-5 space-y-4">
            <Skeleton className="h-4 w-24" />
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-[38px] sm:h-10 w-full rounded-[var(--radius-btn)]" />
                </div>
              ))}
              <div className="col-span-2 space-y-2">
                <Skeleton className="h-3 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-[38px] sm:h-10 flex-1 rounded-[var(--radius-btn)]" />
                  <Skeleton className="h-[38px] sm:h-10 flex-1 rounded-[var(--radius-btn)]" />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Skeleton className="h-10 w-28 rounded-[var(--radius-btn)]" />
              <Skeleton className="h-9 w-20 rounded-[var(--radius-btn)]" />
            </div>
          </div>
          <div className="aurora-card rounded-2xl p-2.5 sm:p-3 space-y-2">
            <Skeleton className="h-4 w-16" />
            <div
              className="ns-net-builder__canvas-shell w-full"
              style={{
                aspectRatio: "4 / 3",
                maxHeight: "min(54vh, 480px)",
                minHeight: "260px",
              }}
            >
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
            <div className="ns-net-builder__legend">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-20 rounded" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-2.5 lg:sticky lg:top-[calc(var(--ns-height-nav)+12px)] lg:self-start">
          <div className="aurora-card rounded-2xl p-4 sm:p-5">
            <Skeleton className="h-4 w-44 mb-3" />
            <div className="ns-net-builder__empty min-h-[8rem] flex flex-col items-center justify-center gap-2 p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-11 w-full rounded-[var(--radius-btn)]" />
        </div>
      </div>
    </div>
  );
}

export function WifiBuilderPageSkeleton() {
  return (
    <div className="w-full min-w-0 mx-auto pb-10" aria-busy="true">
      <div className="text-center mb-8">
        <Skeleton className="h-9 sm:h-10 w-72 max-w-[95vw] mx-auto" />
        <Skeleton className="h-4 w-80 max-w-full mx-auto mt-2" />
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] gap-5">
        <div className="space-y-4">
          <div className="aurora-card rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-10 w-36 rounded-[var(--radius-btn)]" />
            </div>
            <div className="flex flex-col gap-2 min-w-0 sm:flex-row sm:items-end sm:gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-10 w-full rounded-[var(--radius-btn)]" />
              </div>
              <Skeleton className="h-10 w-full sm:w-44 rounded-[var(--radius-btn)] shrink-0" />
            </div>
            <div className="rounded-xl overflow-hidden ns-chip">
              <Skeleton
                className="w-full block"
                style={{ aspectRatio: "720 / 480" }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-20" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="aurora-card rounded-2xl p-5 space-y-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-[var(--radius-btn)]" />
            <Skeleton className="h-3 w-full max-w-[16rem]" />
          </div>
          <div className="aurora-card rounded-2xl p-5 min-w-0 overflow-hidden">
            <Skeleton className="h-4 w-44 mb-4" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-11 w-full rounded-[var(--radius-btn)]" />
        </div>
      </div>
    </div>
  );
}

export function ChatPageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8" aria-busy="true">
      <div className="mb-4 flex items-center gap-2 sm:mb-6 sm:gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-[var(--radius-btn)]" />
        <Skeleton className="h-7 sm:h-8 w-40" />
      </div>
      <ChatPanelSkeleton className="w-full" />
    </div>
  );
}

export function AdminOrdersPageSkeleton() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col space-y-4 sm:space-y-5" aria-busy="true">
      <Skeleton className="h-4 w-28" />
      <OrderListSkeleton count={4} />
    </div>
  );
}

export function AdminProductsPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Skeleton className="h-10 w-full sm:w-80 rounded-[var(--radius-btn)]" />
          <Skeleton className="h-10 w-full sm:w-64 rounded-[var(--radius-btn)]" />
        </div>
        <Skeleton className="h-10 w-full sm:w-auto sm:min-w-[9rem] rounded-[var(--radius-btn)]" />
      </div>
      <div>
        <Skeleton className="h-4 w-32 mb-3" />
        <AdminProductsTableSkeleton />
      </div>
    </div>
  );
}

export function AdminUsersPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-4 w-28" />
      <AdminUsersListSkeleton rows={6} />
    </div>
  );
}

export function AdminChatsPageSkeleton() {
  return (
    <div
      className="flex h-full min-h-0 flex-1 items-stretch gap-3 overflow-hidden"
      aria-busy="true"
    >
      <div className="ns-card-static h-full min-h-0 w-full md:w-80 md:shrink-0 flex flex-col overflow-hidden rounded-2xl border border-ns-border">
        <div className="px-5 py-4 border-b border-ns-border space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="p-3 flex-1 min-h-0">
          <AdminChatListSkeleton rows={5} />
        </div>
      </div>
      <div className="hidden md:flex flex-1 min-w-0">
        <ChatPanelSkeleton className="w-full" />
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
      <div className="min-w-0">
        <Skeleton className="h-3 w-40 mb-2" />
        <div className="ns-admin-stats-export w-full sm:w-fit">
          <Skeleton className="ns-admin-stats-export__date h-10 rounded-[var(--radius-btn)]" />
          <Skeleton className="h-10 w-36 shrink-0 rounded-[var(--radius-btn)]" />
        </div>
      </div>
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
        <table className="ns-admin-products-table w-full text-sm xl:text-[15px]">
          <thead className="ns-table-head">
            <tr>
              {["Товар", "Категория", "Цена", "Остаток", ""].map((h) => (
                <th
                  key={h}
                  className={`px-4 py-3 xl:px-5 xl:py-3.5 text-xs xl:text-sm font-semibold text-ns-text ${h === "Цена" || h === "Остаток" ? "text-right" : "text-left"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ns-border">
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 5 }).map((__, col) => (
                  <td key={col} className="px-4 py-3 xl:px-5 xl:py-3.5">
                    <Skeleton
                      className={`h-4 ${col === 0 ? "w-40" : col === 4 ? "h-8 w-8 ml-auto" : "w-16 ml-auto"}`}
                    />
                  </td>
                ))}
              </tr>
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
    <div className="aurora-card overflow-hidden" aria-busy="true">
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="ns-table-head">
            <tr>
              {["Пользователь", "Роль", "Почта", "Заказов", "Дата", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-6 py-4 text-xs font-semibold text-ns-text"
                  >
                    {h || <span className="sr-only">Действия</span>}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-ns-border">
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i}>
                <td className="px-6 py-4 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-9 w-36 rounded-[var(--radius-btn)]" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-6 w-24 rounded-full" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-6" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-3 w-20" />
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-8 w-8 rounded-[var(--radius-btn)]" />
                    <Skeleton className="h-8 w-8 rounded-[var(--radius-btn)]" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="lg:hidden divide-y divide-ns-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 sm:py-5"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-9 w-24 rounded-[var(--radius-btn)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatPanelSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`aurora-card flex flex-col overflow-hidden border border-ns-border ${className}`.trim()}
      style={{
        height: "min(560px, calc(100dvh - 12rem))",
        minHeight: "min(500px, calc(100dvh - 10rem))",
      }}
      aria-busy="true"
    >
      <div className="px-5 py-4 border-b border-ns-border flex items-center gap-3">
        <Skeleton className="h-2 w-2 shrink-0 rounded-[var(--radius-btn)]" />
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

