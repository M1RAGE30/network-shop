import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import { formatPrice } from "../../lib/format";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { pluralizeProducts } from "../../lib/pluralize";
import ConfirmDialog from "../../components/ConfirmDialog";
import MediaImage from "../../components/MediaImage";
import { inputCls, selectCls, labelCls, textareaCls } from "../../lib/uiClasses";
import { categoryDisplayName } from "../../lib/categoryName";

interface ProductForm {
  name: string;
  slug: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
  brandId: string;
  imageUrl: string;
  specs: string;
}

const emptyForm: ProductForm = {
  name: "",
  slug: "",
  description: "",
  price: "",
  stock: "0",
  categoryId: "",
  brandId: "",
  imageUrl: "",
  specs: "",
};

const toSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

export default function AdminProductsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    id: number | null;
    name: string;
  }>({ open: false, id: null, name: "" });
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const { data: productsData } = useQuery({
    queryKey: ["admin-products", searchQuery, categoryFilter],
    queryFn: () =>
      api
        .get("/products", {
          params: {
            limit: 100,
            search: searchQuery,
            ...(categoryFilter ? { category: categoryFilter } : {}),
          },
        })
        .then((r) => r.data),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories").then((r) => r.data),
  });
  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => api.get("/brands").then((r) => r.data),
  });

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return form.imageUrl || null;
    const fd = new FormData();
    fd.append("image", imageFile);
    const { data } = await api.post("/upload/image", fd);
    return data.url;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const imageUrl = await uploadImage();
      let specs: Record<string, string> | null = null;
      if (form.specs.trim()) {
        try {
          specs = JSON.parse(form.specs);
        } catch {
          specs = null;
        }
      }
      const payload = {
        name: form.name,
        slug: form.slug || toSlug(form.name),
        description: form.description,
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        categoryId: parseInt(form.categoryId),
        brandId: parseInt(form.brandId),
        imageUrl,
        specs,
      };
      return editId
        ? api.put(`/products/${editId}`, payload)
        : api.post("/products", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      setImageFile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      slug: p.slug,
      description: p.description || "",
      price: String(p.price),
      stock: String(p.stock),
      categoryId: String(p.categoryId),
      brandId: String(p.brandId),
      imageUrl: p.imageUrl || "",
      specs: p.specs ? JSON.stringify(p.specs, null, 2) : "",
    });
    setShowForm(true);
  };

  const field = (
    key: keyof ProductForm,
    label: string,
    type = "text",
    placeholder = "",
  ) => (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className={inputCls}
        value={form[key]}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:flex-initial sm:w-80">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 text-ns-muted"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Поиск товаров..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ns-input ns-input-search w-full rounded-full pr-10 py-2 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-ns-hover text-ns-muted hover:text-ns-text transition-colors"
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}
          </div>
          <div className="relative w-full sm:w-64">
            <select
              className={`${selectCls} rounded-full text-sm`}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Все категории</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.slug}>
                  {categoryDisplayName(c.name)}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-ns-muted"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
        <button
          onClick={() => {
            setEditId(null);
            setForm(emptyForm);
            setImageFile(null);
            setShowForm(true);
          }}
          className="ns-btn ns-btn-primary flex items-center gap-2 px-5 text-sm whitespace-nowrap shrink-0"
        >
          <Plus size={16} strokeWidth={2} /> Добавить товар
        </button>
      </div>

      {showForm && (
        <div className="aurora-card rounded-3xl p-8 space-y-6">
          <div className="flex items-center justify-between pb-4">
            <p className="text-xl font-semibold text-ns-text">
              {editId ? "Редактировать товар" : "Новый товар"}
            </p>
            <button
              onClick={() => setShowForm(false)}
              className="p-2 rounded-full hover:bg-ns-hover transition-colors text-ns-text"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("name", "Название")}
            {field("slug", "URL", "text", "авто")}
            {field("price", "Цена (BYN)", "number")}
            {field("stock", "Остаток", "number")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Категория</label>
              <div className="relative">
                <select
                  className={selectCls}
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, categoryId: e.target.value }))
                  }
                >
                  <option value="">Выберите...</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {categoryDisplayName(c.name)}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-ns-muted"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
            <div>
              <label className={labelCls}>Бренд</label>
              <div className="relative">
                <select
                  className={selectCls}
                  value={form.brandId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, brandId: e.target.value }))
                  }
                >
                  <option value="">Выберите...</option>
                  {brands.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-ns-muted"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <label className={labelCls}>Описание</label>
            <textarea
              rows={6}
              className={textareaCls}
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>
          <div>
            <label className={labelCls}>Характеристики (JSON)</label>
            <textarea
              rows={8}
              placeholder={'{"Порты": "24"}'}
              className={textareaCls + " font-mono"}
              value={form.specs}
              onChange={(e) =>
                setForm((p) => ({ ...p, specs: e.target.value }))
              }
            />
          </div>
          <div>
            <label className={labelCls}>Фото</label>
            <input
              id="admin-product-image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex items-center gap-3">
              <label
                htmlFor="admin-product-image-upload"
                className="ns-btn ns-btn-secondary cursor-pointer text-sm"
              >
                Выбрать файл
              </label>
              <span className="text-sm text-ns-muted">
                {imageFile?.name || "Файл не выбран"}
              </span>
            </div>
            {form.imageUrl && !imageFile && (
              <MediaImage
                src={form.imageUrl}
                alt="Предпросмотр"
                className="mt-3 h-20 w-full object-cover rounded-xl bg-ns-hover"
              />
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="ns-btn ns-btn-primary text-sm"
            >
              {saveMutation.isPending ? "Сохранение..." : "Сохранить"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="ns-btn ns-btn-secondary text-sm"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-ns-muted mb-3">
          {searchQuery
            ? `Найдено: ${pluralizeProducts(productsData?.total ?? 0)}`
            : pluralizeProducts(productsData?.total ?? 0)}
        </p>
        <div className="aurora-card rounded-3xl overflow-hidden">
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
                {productsData?.products?.map((p: any) => (
                  <tr
                    key={p.id}
                    className="ns-row-hover transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-ns-input rounded-xl flex items-center justify-center shrink-0">
                          {p.imageUrl ? (
                            <MediaImage
                              src={p.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-ns-muted text-lg">
                              ?
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-ns-text">
                            {p.name}
                          </p>
                          <p className="text-xs text-ns-muted">
                            {p.brand?.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-ns-muted">
                      {categoryDisplayName(p.category?.name)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-ns-text">
                      {formatPrice(p.price)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full ${p.stock > 0 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}`}
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="p-2 rounded-full hover:bg-ns-hover transition-colors text-ns-text"
                        >
                          <Pencil size={16} strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDelete({
                              open: true,
                              id: p.id,
                              name: p.name,
                            });
                          }}
                          className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-600 dark:text-red-400"
                        >
                          <Trash2 size={16} strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-ns-border">
            {productsData?.products?.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 px-6 py-4">
                <div className="w-14 h-14 bg-ns-input rounded-xl flex items-center justify-center shrink-0">
                  {p.imageUrl ? (
                    <MediaImage
                      src={p.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-ns-muted">
                      ?
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ns-text truncate">
                    {p.name}
                  </p>
                  <p className="text-xs text-ns-muted">
                    {p.brand?.name} · {formatPrice(p.price)}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="p-2 rounded-full hover:bg-ns-hover transition-colors text-ns-text"
                  >
                    <Pencil size={16} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete({ open: true, id: p.id, name: p.name });
                    }}
                    className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-600 dark:text-red-400"
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete.open}
        title="Удалить товар?"
        message={`Товар “${confirmDelete.name}” будет удалён без возможности восстановления.`}
        confirmText={deleteMutation.isPending ? "Удаление..." : "Удалить"}
        onCancel={() => setConfirmDelete({ open: false, id: null, name: "" })}
        onConfirm={() => {
          if (confirmDelete.id == null) return;
          deleteMutation.mutate(confirmDelete.id, {
            onSettled: () =>
              setConfirmDelete({ open: false, id: null, name: "" }),
          });
        }}
      />
    </div>
  );
}
