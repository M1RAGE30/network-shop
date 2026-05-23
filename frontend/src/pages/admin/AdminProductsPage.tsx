import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import { formatPrice } from "../../lib/format";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { pluralizeProducts } from "../../lib/pluralize";
import ConfirmDialog from "../../components/ConfirmDialog";
import MediaImage from "../../components/MediaImage";
import { inputCls, selectCls, labelCls, textareaCls } from "../../lib/uiClasses";
import { categoryDisplayName } from "../../lib/categoryName";
import { authErrorBox } from "../../lib/authFormStyles";
import { scrollToFormElement } from "../../lib/scrollToForm";
import { useToastStore } from "../../store/toastStore";

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

const ADMIN_PRODUCTS_PAGE_SIZE = 50;

type ProductFormErrors = Partial<Record<keyof ProductForm, string>>;

function validateProductForm(form: ProductForm): ProductFormErrors {
  const errors: ProductFormErrors = {};
  if (!form.name.trim()) errors.name = "Укажите название";
  if (!form.categoryId) errors.categoryId = "Выберите категорию";
  if (!form.brandId) errors.brandId = "Выберите бренд";
  const price = parseFloat(form.price);
  if (!form.price.trim() || Number.isNaN(price) || price <= 0) {
    errors.price = "Укажите корректную цену";
  }
  const stock = parseInt(form.stock, 10);
  if (form.stock.trim() === "" || Number.isNaN(stock) || stock < 0) {
    errors.stock = "Укажите остаток";
  }
  if (form.specs.trim()) {
    try {
      JSON.parse(form.specs);
    } catch {
      errors.specs = "Некорректный JSON";
    }
  }
  return errors;
}

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
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [listPage, setListPage] = useState(1);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySlug, setNewCategorySlug] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [formErrors, setFormErrors] = useState<ProductFormErrors>({});
  const productFormRef = useRef<HTMLDivElement>(null);
  const toast = useToastStore((s) => s.show);

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["admin-products", searchQuery, categoryFilter, listPage],
    queryFn: () =>
      api
        .get("/products", {
          params: {
            page: listPage,
            limit: ADMIN_PRODUCTS_PAGE_SIZE,
            sort: "name-asc",
            search: searchQuery || undefined,
            includeOutOfStock: 1,
            ...(categoryFilter ? { category: categoryFilter } : {}),
          },
        })
        .then((r) => r.data),
  });

  const listTotal = productsData?.total ?? 0;
  const listPages = productsData?.pages ?? 1;
  const shownCount = productsData?.products?.length ?? 0;
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories").then((r) => r.data),
  });
  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => api.get("/brands").then((r) => r.data),
  });

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) =>
        a.name.localeCompare(b.name, "ru"),
      ),
    [categories],
  );

  const sortedBrands = useMemo(
    () => [...brands].sort((a, b) => a.name.localeCompare(b.name, "ru")),
    [brands],
  );

  useEffect(() => {
    setListPage(1);
  }, [searchQuery, categoryFilter]);

  useEffect(() => {
    if (listPage > listPages) setListPage(Math.max(1, listPages));
  }, [listPage, listPages]);

  const createCategoryMutation = useMutation({
    mutationFn: (payload: { name: string; slug?: string }) =>
      api.post("/categories", payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setForm((p) => ({ ...p, categoryId: String(res.data.id) }));
      setNewCategoryName("");
      setNewCategorySlug("");
      setShowNewCategory(false);
      toast("Категория добавлена");
    },
    onError: (err: any) => {
      toast(err.response?.data?.message || "Не удалось создать категорию", "error");
    },
  });

  const createBrandMutation = useMutation({
    mutationFn: (payload: { name: string }) => api.post("/brands", payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["brands"] });
      setForm((p) => ({ ...p, brandId: String(res.data.id) }));
      setNewBrandName("");
      setShowNewBrand(false);
      toast("Бренд добавлен");
    },
    onError: (err: any) => {
      toast(err.response?.data?.message || "Не удалось создать бренд", "error");
    },
  });

  useEffect(() => {
    if (!imageFile) {
      setFilePreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setFilePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const previewImageSrc =
    filePreviewUrl ?? (form.imageUrl.trim() || null);

  const uploadImage = async (): Promise<string | null> => {
    if (imageFile) {
      const fd = new FormData();
      fd.append("image", imageFile);
      const { data } = await api.post("/upload/image", fd);
      return data.url;
    }
    const url = form.imageUrl.trim();
    return url || null;
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
      setFormErrors({});
      setImageFile(null);
      setFilePreviewUrl(null);
      toast("Товар сохранён");
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast(
        err.response?.data?.message || "Не удалось сохранить товар",
        "error",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const clearFieldError = (key: keyof ProductForm) => {
    setFormErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = () => {
    const errors = validateProductForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast("Заполните все обязательные поля", "error");
      scrollToFormElement(productFormRef.current);
      return;
    }
    setFormErrors({});
    saveMutation.mutate();
  };

  const openEdit = (p: any) => {
    setFormErrors({});
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
    setImageFile(null);
    setShowForm(true);
  };

  const resetImageInputs = () => {
    setImageFile(null);
    setForm((p) => ({ ...p, imageUrl: "" }));
  };

  useEffect(() => {
    if (showForm) scrollToFormElement(productFormRef.current);
  }, [showForm, editId]);

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
        className={`${inputCls} ${formErrors[key] ? "ring-2 ring-red-500" : ""}`}
        value={form[key]}
        onChange={(e) => {
          clearFieldError(key);
          setForm((p) => ({ ...p, [key]: e.target.value }));
        }}
      />
      {formErrors[key] && (
        <p className="mt-1.5 text-xs font-medium text-red-500">{formErrors[key]}</p>
      )}
    </div>
  );

  const selectFieldCls = (hasError: boolean) =>
    `${selectCls} ${hasError ? "ring-2 ring-red-500" : ""}`;

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
            className="ns-input ns-input-search w-full pr-10 py-2 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 ns-action-icon text-ns-muted hover:text-ns-text"
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}
          </div>
          <div className="relative w-full sm:w-64">
            <select
              className={`${selectCls} text-sm`}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Все категории</option>
              {sortedCategories.map((c: { id: number; slug: string; name: string }) => (
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
            setFormErrors({});
            setImageFile(null);
            setFilePreviewUrl(null);
            setShowForm(true);
          }}
          className="ns-btn ns-btn-primary flex items-center gap-2 px-5 text-sm whitespace-nowrap shrink-0"
        >
          <Plus size={16} strokeWidth={2} /> Добавить товар
        </button>
      </div>

      {showForm && (
        <div
          ref={productFormRef}
          className="aurora-card scroll-mt-4 rounded-3xl p-8 space-y-6"
        >
          <div className="flex items-center justify-between pb-4">
            <p className="text-xl font-semibold text-ns-text">
              {editId ? "Редактировать товар" : "Новый товар"}
            </p>
            <button
              onClick={() => setShowForm(false)}
              className="ns-action-icon text-ns-text"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>
          {Object.keys(formErrors).length > 0 && (
            <div className={authErrorBox} role="alert">
              Заполните все обязательные поля перед сохранением
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("name", "Название")}
            {field("slug", "URL", "text", "авто")}
            {field("price", "Цена (BYN)", "number")}
            {field("stock", "Остаток", "number")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className={labelCls}>Категория</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCategory((v) => !v);
                    setShowNewBrand(false);
                  }}
                  className="text-xs font-semibold text-ns-text-secondary hover:text-ns-text"
                >
                  {showNewCategory ? "Отмена" : "+ Новая категория"}
                </button>
              </div>
              <div className="relative">
                <select
                  className={selectFieldCls(!!formErrors.categoryId)}
                  value={form.categoryId}
                  onChange={(e) => {
                    clearFieldError("categoryId");
                    setForm((p) => ({ ...p, categoryId: e.target.value }));
                  }}
                >
                  <option value="">Выберите...</option>
                  {sortedCategories.map((c: { id: number; name: string }) => (
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
              {formErrors.categoryId && (
                <p className="text-xs font-medium text-red-500">
                  {formErrors.categoryId}
                </p>
              )}
              {showNewCategory && (
                <div className="space-y-3 rounded-xl border border-ns-border bg-ns-elevated/50 p-4">
                  <div>
                    <label className={labelCls}>Название категории</label>
                    <input
                      className={inputCls}
                      value={newCategoryName}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewCategoryName(v);
                        setNewCategorySlug(toSlug(v));
                      }}
                      placeholder="Например, Маршрутизаторы"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>URL (slug)</label>
                    <input
                      className={inputCls}
                      value={newCategorySlug}
                      onChange={(e) => setNewCategorySlug(e.target.value)}
                      placeholder="routers"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={
                      !newCategoryName.trim() || createCategoryMutation.isPending
                    }
                    onClick={() =>
                      createCategoryMutation.mutate({
                        name: newCategoryName.trim(),
                        slug: newCategorySlug.trim() || undefined,
                      })
                    }
                    className="ns-btn ns-btn-secondary w-full text-sm disabled:opacity-40"
                  >
                    {createCategoryMutation.isPending
                      ? "Создание..."
                      : "Создать категорию"}
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className={labelCls}>Бренд</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewBrand((v) => !v);
                    setShowNewCategory(false);
                  }}
                  className="text-xs font-semibold text-ns-text-secondary hover:text-ns-text"
                >
                  {showNewBrand ? "Отмена" : "+ Новый бренд"}
                </button>
              </div>
              <div className="relative">
                <select
                  className={selectFieldCls(!!formErrors.brandId)}
                  value={form.brandId}
                  onChange={(e) => {
                    clearFieldError("brandId");
                    setForm((p) => ({ ...p, brandId: e.target.value }));
                  }}
                >
                  <option value="">Выберите...</option>
                  {sortedBrands.map((b: { id: number; name: string }) => (
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
              {formErrors.brandId && (
                <p className="text-xs font-medium text-red-500">
                  {formErrors.brandId}
                </p>
              )}
              {showNewBrand && (
                <div className="space-y-3 rounded-xl border border-ns-border bg-ns-elevated/50 p-4">
                  <div>
                    <label className={labelCls}>Название бренда</label>
                    <input
                      className={inputCls}
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      placeholder="Например, TP-Link"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={
                      !newBrandName.trim() || createBrandMutation.isPending
                    }
                    onClick={() =>
                      createBrandMutation.mutate({
                        name: newBrandName.trim(),
                      })
                    }
                    className="ns-btn ns-btn-secondary w-full text-sm disabled:opacity-40"
                  >
                    {createBrandMutation.isPending
                      ? "Создание..."
                      : "Создать бренд"}
                  </button>
                </div>
              )}
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
              className={`${textareaCls} font-mono ${formErrors.specs ? "ring-2 ring-red-500" : ""}`}
              value={form.specs}
              onChange={(e) => {
                clearFieldError("specs");
                setForm((p) => ({ ...p, specs: e.target.value }));
              }}
            />
            {formErrors.specs && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                {formErrors.specs}
              </p>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Ссылка на изображение</label>
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                className={inputCls}
                value={form.imageUrl}
                onChange={(e) => {
                  setImageFile(null);
                  setForm((p) => ({ ...p, imageUrl: e.target.value }));
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="admin-product-image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  setImageFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
              <label
                htmlFor="admin-product-image-upload"
                className="ns-btn ns-btn-secondary cursor-pointer text-sm"
              >
                Выбрать файл
              </label>
              <span className="text-sm text-ns-muted min-w-0 truncate">
                {imageFile?.name || "Файл не выбран"}
              </span>
              {(previewImageSrc || imageFile) && (
                <button
                  type="button"
                  onClick={resetImageInputs}
                  className="text-sm font-medium text-ns-text-secondary hover:text-ns-text"
                >
                  Убрать фото
                </button>
              )}
            </div>
            <div className="flex min-h-[10rem] max-h-80 items-center justify-center overflow-hidden rounded-xl border border-ns-border bg-ns-hover/40 p-4">
              {previewImageSrc ? (
                <MediaImage
                  src={previewImageSrc}
                  alt="Предпросмотр"
                  className="max-h-72 max-w-full w-auto object-contain"
                />
              ) : (
                <span className="text-sm text-ns-muted">Предпросмотр появится здесь</span>
              )}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
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
            ? `Найдено: ${pluralizeProducts(listTotal)}`
            : pluralizeProducts(listTotal)}
          {!productsLoading && listTotal > 0 && listPages > 1 && (
            <span className="font-normal text-ns-text-secondary">
              {" "}
              · стр. {listPage} из {listPages} (по {ADMIN_PRODUCTS_PAGE_SIZE} на
              странице)
            </span>
          )}
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
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full tabular-nums ${
                          p.stock > 0
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="ns-action-icon text-ns-text"
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
                          className="ns-action-icon ns-action-icon--square text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
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
              <div key={p.id} className="flex items-center gap-3 px-4 py-4">
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
                  <p className="text-sm text-ns-muted">
                    {p.brand?.name} · {formatPrice(p.price)}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="ns-action-icon text-ns-text"
                  >
                    <Pencil size={16} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete({ open: true, id: p.id, name: p.name });
                    }}
                    className="ns-action-icon ns-action-icon--square text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {listPages > 1 && (
          <div className="mt-4 flex flex-wrap justify-center items-center gap-1.5">
            <button
              type="button"
              onClick={() => setListPage((p) => Math.max(1, p - 1))}
              disabled={listPage <= 1}
              className="px-3 py-2 rounded-[var(--radius-btn)] text-sm font-medium bg-ns-elevated border border-ns-border text-ns-text disabled:opacity-30 hover:bg-ns-hover transition-colors"
            >
              ←
            </button>
            {Array.from({ length: listPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 || p === listPages || Math.abs(p - listPage) <= 2,
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
                    type="button"
                    onClick={() => setListPage(p)}
                    className={`min-w-9 h-9 rounded-[var(--radius-btn)] text-sm font-medium transition-colors ${
                      listPage === p
                        ? "bg-ns-accent text-ns-accent-fg"
                        : "bg-ns-elevated border border-ns-border hover:bg-ns-hover text-ns-text"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
            <button
              type="button"
              onClick={() => setListPage((p) => Math.min(listPages, p + 1))}
              disabled={listPage >= listPages}
              className="px-3 py-2 rounded-[var(--radius-btn)] text-sm font-medium bg-ns-elevated border border-ns-border text-ns-text disabled:opacity-30 hover:bg-ns-hover transition-colors"
            >
              →
            </button>
          </div>
        )}
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
