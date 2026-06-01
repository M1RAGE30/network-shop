import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import api from "../lib/api";
import ProductCard from "../components/ProductCard";
import { ProductCardSkeletonGrid } from "../components/skeleton/Skeleton";
import { Search, X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { productCountLabel } from "../lib/pluralize";
import { useBodyScrollLock } from "../lib/useBodyScrollLock";
import CatalogCategoryPicker from "../components/CatalogCategoryPicker";
import CatalogFilterOverlay from "../components/CatalogFilterOverlay";
import {
  countAppliedCatalogFilters,
  formatSpecFilterLabel,
  getExcludedSpecKeysForCategory,
  parseSpecFilters,
  sortSpecFilterValues,
  stripExcludedSpecFilters,
} from "../lib/catalogFilters";

const CATEGORY_SPEC_FILTERS: Record<
  string,
  Array<{ key: string; label: string }>
> = {
  routers: [
    { key: "Стандарты беспроводной связи", label: "Wi-Fi стандарт" },
    { key: "Диапазон частот", label: "Диапазон" },
    { key: "Поддержка сотовой связи", label: "Сотовая связь" },
    { key: "Всего LAN-портов", label: "LAN-порты" },
    { key: "Количество антенн", label: "Количество антенн" },
    { key: "MIMO", label: "MIMO" },
    { key: "Порты USB", label: "USB" },
    { key: "Цвет", label: "Цвет" },
  ],
  switches: [
    { key: "Количество портов", label: "Порты" },
    { key: "Всего портов", label: "Порты" },
    { key: "Скорость портов", label: "Скорость" },
    { key: "Управляемый", label: "Управление" },
    { key: "PoE", label: "PoE" },
  ],
  "access-points": [
    { key: "Стандарты беспроводной связи", label: "Wi-Fi стандарт" },
    { key: "Диапазон частот", label: "Диапазон" },
    { key: "MIMO", label: "MIMO" },
    { key: "PoE", label: "PoE" },
    { key: "Цвет", label: "Цвет" },
  ],
  "wifi-adapters": [
    { key: "Стандарты беспроводной связи", label: "Wi-Fi стандарт" },
    { key: "Интерфейс подключения", label: "Интерфейс" },
    { key: "Диапазон частот", label: "Диапазон" },
    { key: "MIMO", label: "MIMO" },
  ],
  "usb-adapters": [
    { key: "Интерфейсы устройства", label: "Интерфейсы" },
    { key: "Стандарты", label: "Стандарты" },
    { key: "Индикаторы", label: "Индикаторы" },
  ],
  storage: [
    { key: "Тип", label: "Тип" },
    { key: "Интерфейс", label: "Интерфейс" },
    { key: "Количество отсеков", label: "Отсеки" },
  ],
  "patch-cords": [
    { key: "Тип", label: "Тип" },
    { key: "Длина кабеля", label: "Длина" },
    { key: "Категория кабеля", label: "Категория" },
    { key: "Цвет", label: "Цвет" },
  ],
};

const EXCLUDED_DYNAMIC_SPEC_KEYS = new Set([
  "Бренд",
  "Гарантия",
  "Страна происхождения (производства)",
]);

const CATALOG_PAGE_SIZE = 20;

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [brandFilter, setBrandFilter] = useState(searchParams.get("brand") || "");
  const [draftSpecFilters, setDraftSpecFilters] = useState<Record<string, string>>(
    () =>
      stripExcludedSpecFilters(
        searchParams.get("category") || "",
        parseSpecFilters(searchParams.get("specs")),
      ),
  );
  const [priceError, setPriceError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const minPriceDraftRef = useRef(searchParams.get("minPrice") || "");
  const maxPriceDraftRef = useRef(searchParams.get("maxPrice") || "");
  const selectedCategory = searchParams.get("category") || "";
  const specFilters = useMemo(
    () =>
      stripExcludedSpecFilters(
        selectedCategory,
        parseSpecFilters(searchParams.get("specs")),
      ),
    [searchParams, selectedCategory],
  );
  const productQueryParams = useMemo(() => {
    const entries = [...searchParams.entries()].filter(([key]) => key !== "limit");
    const next = Object.fromEntries(entries) as Record<string, string>;
    const category = next.category ?? "";
    if (category && next.specs) {
      const cleaned = stripExcludedSpecFilters(
        category,
        parseSpecFilters(next.specs),
      );
      if (Object.keys(cleaned).length) next.specs = JSON.stringify(cleaned);
      else delete next.specs;
    }
    next.limit = String(CATALOG_PAGE_SIZE);
    return next;
  }, [searchParams]);

  useEffect(() => {
    if (!searchParams.has("limit")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("limit");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const category = searchParams.get("category") || "";
    if (!category || !searchParams.get("specs")) return;
    const raw = parseSpecFilters(searchParams.get("specs"));
    const cleaned = stripExcludedSpecFilters(category, raw);
    if (JSON.stringify(raw) === JSON.stringify(cleaned)) return;
    const next = new URLSearchParams(searchParams);
    if (Object.keys(cleaned).length) next.set("specs", JSON.stringify(cleaned));
    else next.delete("specs");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setBrandFilter(searchParams.get("brand") || "");
    setDraftSpecFilters(
      stripExcludedSpecFilters(
        searchParams.get("category") || "",
        parseSpecFilters(searchParams.get("specs")),
      ),
    );
    minPriceDraftRef.current = searchParams.get("minPrice") || "";
    maxPriceDraftRef.current = searchParams.get("maxPrice") || "";
    document
      .querySelectorAll<HTMLInputElement>("[data-catalog-min-price]")
      .forEach((input) => {
        input.value = minPriceDraftRef.current;
      });
    document
      .querySelectorAll<HTMLInputElement>("[data-catalog-max-price]")
      .forEach((input) => {
        input.value = maxPriceDraftRef.current;
      });
  }, [searchParams]);

  useEffect(() => {
    const trimmed = search.trim();
    const urlSearch = searchParams.get("search") || "";
    if (trimmed === urlSearch) return;

    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (trimmed) next.set("search", trimmed);
      else next.delete("search");
      next.delete("page");
      setSearchParams(next);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search, searchParams, setSearchParams]);

  useBodyScrollLock(filtersOpen, "catalog-filters-open");

  const applyFilters = () => {
    const minPrice = minPriceDraftRef.current.trim();
    const maxPrice = maxPriceDraftRef.current.trim();
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      setPriceError("Мин. цена больше макс.");
      return;
    }
    setPriceError("");

    const next = new URLSearchParams();
    if (selectedCategory) next.set("category", selectedCategory);
    if (search.trim()) next.set("search", search.trim());
    if (brandFilter) next.set("brand", brandFilter);
    if (minPrice) next.set("minPrice", minPrice);
    if (maxPrice) next.set("maxPrice", maxPrice);
    const specs = stripExcludedSpecFilters(selectedCategory, draftSpecFilters);
    if (Object.keys(specs).length) next.set("specs", JSON.stringify(specs));
    next.set("sort", searchParams.get("sort") || "newest");
    setSearchParams(next);
    setFiltersOpen(false);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["products", productQueryParams],
    queryFn: () =>
      api.get("/products", { params: productQueryParams }).then((r) => r.data),
    enabled: !!selectedCategory,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories").then((r) => r.data),
  });

  const { data: categoryProductsData } = useQuery({
    queryKey: ["category-filter-meta", selectedCategory],
    queryFn: () =>
      api
        .get("/products/filter-meta", {
          params: { category: selectedCategory },
        })
        .then((r) => r.data),
    enabled: !!selectedCategory,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (selectedCategory || !categories?.length) return;
    const next = new URLSearchParams(searchParams);
    next.set("category", categories[0].slug);
    next.delete("page");
    setSearchParams(next, { replace: true });
  }, [categories, selectedCategory]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  };
  const updateCategory = (slug: string) => {
    if (slug === selectedCategory) return;
    setFiltersOpen(false);
    const next = new URLSearchParams();
    next.set("category", slug);
    next.set("sort", searchParams.get("sort") || "newest");
    minPriceDraftRef.current = "";
    maxPriceDraftRef.current = "";
    setSearch("");
    setBrandFilter("");
    setDraftSpecFilters({});
    setPriceError("");
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const updateSpecFilter = (key: string, value: string) => {
    const nextFilters = { ...draftSpecFilters };
    if (value) nextFilters[key] = value;
    else delete nextFilters[key];
    setDraftSpecFilters(nextFilters);
  };

  const clearFilters = () => {
    setSearch("");
    minPriceDraftRef.current = "";
    maxPriceDraftRef.current = "";
    setBrandFilter("");
    setDraftSpecFilters({});
    setSearchParams(selectedCategory ? { category: selectedCategory } : {});
  };
  const categoryProducts = categoryProductsData?.products ?? [];
  const categoryBrands = useMemo(() => {
    const names = new Set<string>();
    categoryProducts.forEach((product: any) => {
      const name = product.brand?.name;
      if (typeof name === "string" && name.trim()) names.add(name.trim());
    });
    return Array.from(names).sort((a, b) =>
      a.localeCompare(b, "ru", { numeric: true, sensitivity: "base" }),
    );
  }, [categoryProducts]);

  useEffect(() => {
    if (!brandFilter) return;
    if (!categoryBrands.includes(brandFilter)) setBrandFilter("");
  }, [selectedCategory, categoryBrands, brandFilter]);

  const activeSpecFilters = useMemo(() => {
    const preferred = CATEGORY_SPEC_FILTERS[selectedCategory] ?? [];
    const preferredKeys = new Set(preferred.map((filter) => filter.key));
    const categoryExcluded = getExcludedSpecKeysForCategory(selectedCategory);
    const dynamic = new Map<string, Set<string>>();

    categoryProducts.forEach((product: any) => {
      const specs = product.specs;
      if (!specs || typeof specs !== "object") return;

      Object.entries(specs as Record<string, unknown>).forEach(([key, value]) => {
        if (
          preferredKeys.has(key) ||
          EXCLUDED_DYNAMIC_SPEC_KEYS.has(key) ||
          categoryExcluded.has(key)
        ) {
          return;
        }
        if (typeof value !== "string" || !value.trim()) return;
        if (!dynamic.has(key)) dynamic.set(key, new Set());
        dynamic.get(key)!.add(value.trim());
      });
    });

    const extra = Array.from(dynamic.entries())
      .filter(([, values]) => values.size > 1 && values.size <= 30)
      .sort(([keyA], [keyB]) =>
        formatSpecFilterLabel(keyA).localeCompare(
          formatSpecFilterLabel(keyB),
          "ru",
          { sensitivity: "base" },
        ),
      )
      .slice(0, Math.max(0, 12 - preferred.length))
      .map(([key]) => ({ key, label: formatSpecFilterLabel(key) }));

    return [...preferred, ...extra];
  }, [categoryProducts, selectedCategory]);
  const specOptions = useMemo(() => {
    const result: Record<string, string[]> = {};
    activeSpecFilters.forEach(({ key }) => {
      const values = new Set<string>();
      categoryProducts.forEach((product: any) => {
        const value = product.specs?.[key];
        if (typeof value === "string" && value.trim()) values.add(value.trim());
      });
      result[key] = sortSpecFilterValues(key, Array.from(values));
    });
    return result;
  }, [activeSpecFilters, categoryProducts]);
  const appliedFiltersCount = countAppliedCatalogFilters(
    searchParams,
    specFilters,
  );
  const hasFilters = appliedFiltersCount > 0;

  const fieldCls =
    "w-full rounded-xl px-4 py-2.5 text-sm text-ns-text placeholder:text-ns-muted";
  const selectCls =
    `${fieldCls} pr-10 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236e6e73%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[position:right_1rem_center] bg-no-repeat`;

  const FilterFields = ({ variant }: { variant: "sidebar" | "overlay" }) => (
    <div className="space-y-5">
      {variant === "sidebar" && (
        <div className="flex items-center justify-between pb-1">
          <p className="text-sm font-semibold text-ns-text">Фильтры</p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-ns-text-secondary hover:text-ns-text flex items-center gap-1"
            >
              <X size={12} strokeWidth={2} /> Сбросить
            </button>
          )}
        </div>
      )}
      <div>
        <label className="block text-xs font-semibold text-ns-muted mb-2">
          Бренд
        </label>
        <select
          className={selectCls}
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
        >
          <option value="">Все бренды</option>
          {categoryBrands.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      {activeSpecFilters
        .filter(({ key }) => specOptions[key]?.length)
        .map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-ns-muted mb-2">
              {label}
            </label>
            <select
              className={selectCls}
              value={draftSpecFilters[key] || ""}
              onChange={(e) => updateSpecFilter(key, e.target.value)}
            >
              <option value="">Любой вариант</option>
              {specOptions[key].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        ))}
      <div>
        <label className="block text-xs font-semibold text-ns-muted mb-2">
          Цена, BYN
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            placeholder="от"
            className={`${fieldCls} ${priceError ? "ring-2 ring-red-500" : ""}`}
            defaultValue={searchParams.get("minPrice") || ""}
            data-catalog-min-price
            onChange={(e) => {
              minPriceDraftRef.current = e.target.value;
            }}
          />
          <input
            type="number"
            min="0"
            placeholder="до"
            className={`${fieldCls} ${priceError ? "ring-2 ring-red-500" : ""}`}
            defaultValue={searchParams.get("maxPrice") || ""}
            data-catalog-max-price
            onChange={(e) => {
              maxPriceDraftRef.current = e.target.value;
            }}
          />
        </div>
        {priceError && (
          <p className="text-red-500 text-xs font-medium mt-1.5">
            {priceError}
          </p>
        )}
      </div>
      {variant === "sidebar" && (
        <button
          type="button"
          onClick={applyFilters}
          className="ns-btn ns-btn-primary w-full"
        >
          Применить
        </button>
      )}
    </div>
  );

  return (
    <div className="py-6 sm:py-8 w-full min-w-0 mx-auto">
      <div className="mb-8 sm:mb-10">
        <h1 className="ns-heading-page">Каталог оборудования</h1>
      </div>

      <CatalogCategoryPicker
        variant="select"
        categories={categories}
        selectedSlug={selectedCategory}
        onSelect={updateCategory}
      />
      <CatalogCategoryPicker
        variant="rail"
        categories={categories}
        selectedSlug={selectedCategory}
        onSelect={updateCategory}
      />

      <CatalogFilterOverlay
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApply={applyFilters}
        onReset={clearFilters}
      >
        <FilterFields variant="overlay" />
      </CatalogFilterOverlay>

      <div className="ns-catalog-layout">
        <aside className="ns-catalog-filters">
          <div className="ns-catalog-filters-panel ns-card-static sticky top-24 rounded-[20px] p-5 xl:p-6 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-none">
            <FilterFields variant="sidebar" />
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search
                size={16}
                strokeWidth={1.5}
                className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-ns-muted"
              />
              <input
                type="text"
                placeholder="Поиск товаров..."
                className="ns-input ns-input-search w-full pr-10 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFilters();
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ns-muted hover:text-ns-text transition-colors"
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className={`lg:hidden relative flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] text-sm font-medium transition-all min-h-[var(--ns-height-btn)] cursor-pointer ${
                hasFilters
                  ? "bg-ns-accent text-ns-accent-fg"
                  : "bg-ns-elevated text-ns-text-secondary border border-ns-border"
              }`}
            >
              <SlidersHorizontal size={16} strokeWidth={1.5} />
              Фильтры
              {appliedFiltersCount > 0 && (
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-[var(--radius-btn)] bg-white/20 px-1.5 text-xs font-bold text-inherit">
                  {appliedFiltersCount}
                </span>
              )}
            </button>
          </div>

          <div className="ns-catalog-toolbar mb-4">
            {!isLoading && data?.total != null && (
              <p className="ns-catalog-toolbar__count text-sm text-ns-muted">
                Найдено:{" "}
                <span className="font-semibold text-ns-text">{data.total}</span>{" "}
                {productCountLabel(data.total)}
              </p>
            )}
            <select
              className="ns-catalog-toolbar__sort ns-input text-sm"
              value={searchParams.get("sort") || "newest"}
              onChange={(e) => updateFilter("sort", e.target.value)}
            >
              <option value="newest">Сначала новые</option>
              <option value="price-asc">Цена: по возрастанию</option>
              <option value="price-desc">Цена: по убыванию</option>
              <option value="name-asc">Название: А-Я</option>
              <option value="name-desc">Название: Я-А</option>
            </select>
          </div>

          {isLoading ? (
            <ProductCardSkeletonGrid />
          ) : data?.products?.length === 0 ? (
            <div className="aurora-card text-center py-24 rounded-2xl">
              <p className="text-2xl font-semibold text-ns-text mb-4">
                Ничего не найдено
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="ns-icon-round mx-auto flex h-11 w-11 items-center justify-center shadow-sm cursor-pointer"
                aria-label="Сбросить фильтры"
                title="Сбросить фильтры"
              >
                <RotateCcw size={20} strokeWidth={1.75} className="text-ns-icon" />
              </button>
            </div>
          ) : (
            <div className="ns-product-grid">
              {data?.products?.map((p: any) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {data?.pages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-1.5">
              <button
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set("page", String(Math.max(1, (data.page || 1) - 1)));
                  setSearchParams(next);
                }}
                disabled={data.page <= 1}
                className="px-3 py-2 rounded-[var(--radius-btn)] text-sm font-medium bg-ns-elevated border border-ns-border text-ns-text disabled:opacity-30 hover:bg-ns-hover transition-colors cursor-pointer"
              >
                ←
              </button>

              {Array.from({ length: data.pages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 || p === data.pages || Math.abs(p - data.page) <= 2,
                )
                .reduce<(number | "...")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`dots-${i}`} className="px-2 text-ns-muted">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => {
                        const next = new URLSearchParams(searchParams);
                        next.set("page", String(p));
                        setSearchParams(next);
                      }}
                      className={`w-9 h-9 rounded-[var(--radius-btn)] text-sm font-medium transition-colors cursor-pointer ${
                        data.page === p
                          ? "bg-ns-accent text-ns-accent-fg"
                          : "bg-ns-elevated border border-ns-border hover:bg-ns-hover text-ns-text"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}

              <button
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set(
                    "page",
                    String(Math.min(data.pages, (data.page || 1) + 1)),
                  );
                  setSearchParams(next);
                }}
                disabled={data.page >= data.pages}
                className="px-3 py-2 rounded-[var(--radius-btn)] text-sm font-medium bg-ns-elevated border border-ns-border text-ns-text disabled:opacity-30 hover:bg-ns-hover transition-colors cursor-pointer"
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
