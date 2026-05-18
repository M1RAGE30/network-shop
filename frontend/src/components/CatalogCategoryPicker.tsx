interface Category {
  id: number;
  name: string;
  slug: string;
  _count?: { products: number };
}

interface CatalogCategoryPickerProps {
  categories: Category[] | undefined;
  selectedSlug: string;
  onSelect: (slug: string) => void;
  variant: "select" | "rail";
}

export default function CatalogCategoryPicker({
  categories,
  selectedSlug,
  onSelect,
  variant,
}: CatalogCategoryPickerProps) {
  if (!categories?.length) return null;

  if (variant === "select") {
    return (
      <div className="sm:hidden mb-4">
        <label className="ns-label mb-2 block">Категория</label>
        <select
          className="ns-input w-full text-sm"
          value={selectedSlug}
          onChange={(e) => onSelect(e.target.value)}
          aria-label="Выбор категории"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
              {c._count?.products != null ? ` (${c._count.products})` : ""}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <nav className="hidden sm:block mb-6" aria-label="Категории">
      <p className="ns-label mb-2">Категория</p>
      <div className="ns-category-rail__scroll">
        {categories.map((c) => {
          const active = selectedSlug === c.slug;
          return (
            <button
              key={c.id}
              type="button"
              data-category={c.slug}
              onClick={() => onSelect(c.slug)}
              className={`ns-category-rail__pill ${
                active ? "ns-category-rail__pill--active" : ""
              }`}
            >
              <span className="max-w-[14rem] truncate">{c.name}</span>
              {c._count?.products != null && (
                <span className="ns-category-rail__count">{c._count.products}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
