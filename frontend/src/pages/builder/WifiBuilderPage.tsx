import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageUp, Wifi, ShoppingCart, Trash2, Plus } from "lucide-react";
import api from "../../lib/api";
import { formatPrice } from "../../lib/format";
import { useAuthStore } from "../../store/authStore";
import { isCustomer } from "../../lib/roles";
import { useThemeStore } from "../../store/themeStore";
import MediaImage from "../../components/MediaImage";
import {
  pickBest,
  scoreWifiConstructorAp,
  scoreWifiConstructorRouter,
  wifiCoverageRadiusM,
  wifiHeatmapRadiusPx,
} from "../../lib/networkSelector";
import { themeCanvasColors } from "../../lib/themeColors";

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  imageUrl: string | null;
  brand: { name: string };
  specs?: Record<string, string> | null;
}

interface PlacedPoint {
  id: string;
  x: number;
  y: number;
  productId: number;
}

const CANVAS_W = 720;
const CANVAS_H = 480;
const HEATMAP_STEP = 6;

function fetchCategoryProducts(slug: string) {
  return api
    .get("/products", {
      params: { category: slug, limit: 100, sort: "price-asc" },
    })
    .then((r) => r.data.products as Product[]);
}

export default function WifiBuilderPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { dark } = useThemeStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapLayerRef = useRef<HTMLCanvasElement | null>(null);

  const [planUrl, setPlanUrl] = useState<string | null>(null);
  const [planImage, setPlanImage] = useState<HTMLImageElement | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [points, setPoints] = useState<PlacedPoint[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [targetArea, setTargetArea] = useState("120");

  const { data: routers = [] } = useQuery({
    queryKey: ["wifi-routers"],
    queryFn: () => fetchCategoryProducts("routers"),
  });
  const { data: aps = [] } = useQuery({
    queryKey: ["wifi-aps"],
    queryFn: () => fetchCategoryProducts("access-points"),
  });

  const allDevices = useMemo(() => [...routers, ...aps], [routers, aps]);
  const expectedClients = useMemo(
    () => Math.max(4, Math.round(Number(targetArea) / 10)),
    [targetArea],
  );
  const safeTargetArea = useMemo(() => {
    const parsed = Number(targetArea);
    if (!Number.isFinite(parsed) || parsed <= 0) return 120;
    return Math.min(1500, Math.max(10, parsed));
  }, [targetArea]);
  const deferredTargetArea = useDeferredValue(safeTargetArea);

  const recommendedDevice = useMemo(() => {
    const routerBest = pickBest(
      routers,
      (routerCandidate) =>
        scoreWifiConstructorRouter(
          routerCandidate,
          safeTargetArea,
          expectedClients,
        ),
      "lower_price",
    ) as Product | null;
    const apBest = pickBest(
      aps,
      (apCandidate) =>
        scoreWifiConstructorAp(apCandidate, safeTargetArea, expectedClients),
      "lower_price",
    ) as Product | null;

    if (!routerBest && !apBest) return null;
    if (!routerBest) return apBest;
    if (!apBest) return routerBest;

    const sr = scoreWifiConstructorRouter(
      routerBest,
      safeTargetArea,
      expectedClients,
    );
    const sa = scoreWifiConstructorAp(
      apBest,
      safeTargetArea,
      expectedClients,
    );
    return sr >= sa ? routerBest : apBest;
  }, [routers, aps, expectedClients, safeTargetArea]);

  useEffect(() => {
    if (allDevices.length === 0) return;
    setSelectedProductId((prev) => {
      if (prev != null) return prev;
      return recommendedDevice?.id ?? allDevices[0].id;
    });
  }, [allDevices, recommendedDevice]);

  useEffect(() => {
    if (!planUrl) {
      setPlanImage(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!cancelled) setPlanImage(img);
    };
    img.src = planUrl;
    return () => {
      cancelled = true;
      img.onload = null;
    };
  }, [planUrl]);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;

      const colors = themeCanvasColors(dark);
      ctx.fillStyle = colors.fill;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      if (planImage) {
        const ratio = Math.min(
          CANVAS_W / planImage.width,
          CANVAS_H / planImage.height,
        );
        const w = planImage.width * ratio;
        const h = planImage.height * ratio;
        const x = (CANVAS_W - w) / 2;
        const y = (CANVAS_H - h) / 2;
        ctx.globalAlpha = 0.85;
        ctx.drawImage(planImage, x, y, w, h);
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = colors.wall;
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, CANVAS_W - 40, CANVAS_H - 40);
        ctx.fillStyle = colors.label;
        ctx.font = "13px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          "Загрузите план помещения или просто кликайте, чтобы расставить точки",
          CANVAS_W / 2,
          CANVAS_H / 2,
        );
        ctx.textAlign = "start";
      }

      if (points.length > 0) {
        const sources = points
          .map((p) => {
            const product = allDevices.find((d) => d.id === p.productId);
            if (!product) return null;
            const isRouter = routers.some((r) => r.id === p.productId);
            const range = wifiHeatmapRadiusPx(
              product,
              isRouter,
              deferredTargetArea,
            );
            return { x: p.x, y: p.y, invRange: 1 / Math.max(1, range) };
          })
          .filter(
            (s): s is { x: number; y: number; invRange: number } => s != null,
          );

        if (sources.length > 0) {
          let heatCanvas = heatmapLayerRef.current;
          if (!heatCanvas) {
            heatCanvas = document.createElement("canvas");
            heatCanvas.width = CANVAS_W;
            heatCanvas.height = CANVAS_H;
            heatmapLayerRef.current = heatCanvas;
          }
          const lctx = heatCanvas.getContext("2d");
          if (lctx) {
            lctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

            const step = HEATMAP_STEP;
            const heatmap = lctx.createImageData(CANVAS_W, CANVAS_H);
            const data = heatmap.data;
            for (let y = 0; y < CANVAS_H; y += step) {
              for (let x = 0; x < CANVAS_W; x += step) {
                let signal = 0;
                for (let i = 0; i < sources.length; i++) {
                  const src = sources[i];
                  const dx = x - src.x;
                  const dy = y - src.y;
                  const s = Math.max(0, 1 - Math.hypot(dx, dy) * src.invRange);
                  if (s > signal) signal = s;
                }
                if (signal <= 0.05) continue;
                const [r, g, b, a] = signalColor(signal);
                for (let oy = 0; oy < step && y + oy < CANVAS_H; oy++) {
                  for (let ox = 0; ox < step && x + ox < CANVAS_W; ox++) {
                    const idx = ((y + oy) * CANVAS_W + (x + ox)) * 4;
                    data[idx] = r;
                    data[idx + 1] = g;
                    data[idx + 2] = b;
                    data[idx + 3] = a;
                  }
                }
              }
            }
            lctx.putImageData(heatmap, 0, 0);
            ctx.save();
            ctx.globalAlpha = 0.62;
            ctx.drawImage(heatCanvas, 0, 0);
            ctx.restore();
          }
        }

        points.forEach((p, idx) => {
          const product = allDevices.find((d) => d.id === p.productId);
          const isRouter = product
            ? routers.some((r) => r.id === p.productId)
            : false;
          const radiusPx = product
            ? wifiHeatmapRadiusPx(product, isRouter, deferredTargetArea)
            : 0;
          const radiusM = product ? wifiCoverageRadiusM(product) : 0;

          if (radiusPx > 0) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, radiusPx, 0, Math.PI * 2);
            ctx.strokeStyle = dark
              ? "rgba(250, 250, 250, 0.35)"
              : "rgba(9, 9, 11, 0.25)";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            const labelX = Math.min(CANVAS_W - 28, p.x + radiusPx);
            const labelY = p.y;
            ctx.fillStyle = colors.label;
            ctx.font = "600 11px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`${radiusM} м`, labelX, labelY);
            ctx.textAlign = "start";
            ctx.textBaseline = "alphabetic";
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
          ctx.fillStyle = colors.accent;
          ctx.fill();
          ctx.strokeStyle = colors.accentFg;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = colors.accentFg;
          ctx.font = "bold 11px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(idx + 1), p.x, p.y + 1);
          ctx.textAlign = "start";
          ctx.textBaseline = "alphabetic";
        });
      }
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!cancelled) draw();
      });
    };
    schedule();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [points, planImage, dark, deferredTargetArea, routers, allDevices]);

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const { data } = await api.post("/upload/image", fd);
      setPlanUrl(data.url);
    } catch {
      setError("Не удалось загрузить план");
    } finally {
      setUploading(false);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedProductId) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_H;
    const product = allDevices.find((p) => p.id === selectedProductId);
    if (!product) return;
    setPoints((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        x,
        y,
        productId: product.id,
      },
    ]);
  };

  const removePoint = (id: string) =>
    setPoints((prev) => prev.filter((p) => p.id !== id));

  const grouped = useMemo(() => {
    const map = new Map<number, { product: Product; quantity: number }>();
    for (const p of points) {
      const existing = map.get(p.productId);
      const product = allDevices.find((x) => x.id === p.productId);
      if (!product) continue;
      if (existing) existing.quantity++;
      else map.set(p.productId, { product, quantity: 1 });
    }
    return Array.from(map.values());
  }, [points, allDevices]);

  const totalPrice = grouped.reduce(
    (s, i) => s + Number(i.product.price) * i.quantity,
    0,
  );

  const bulkAdd = useMutation({
    mutationFn: () =>
      api.post("/cart/bulk", {
        items: grouped.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      navigate("/cart");
    },
  });

  const canAdd = isCustomer(user) && grouped.length > 0;

  return (
    <div className="w-full min-w-0 mx-auto pb-10">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ns-text tracking-tight">
          Конструктор Wi-Fi покрытия
        </h1>
        <p className="text-sm text-ns-muted mt-2">
          Загрузите план помещения и расставьте точки — увидите карту покрытия
        </p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] gap-5">
        <div className="space-y-4">
          <div className="aurora-card rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full ns-chip hover:bg-ns-hover text-sm font-medium text-ns-text cursor-pointer transition-colors">
                <ImageUp size={15} strokeWidth={1.6} />
                {uploading
                  ? "Загрузка..."
                  : planUrl
                    ? "Заменить план"
                    : "Загрузить план"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
                />
              </label>
              {planUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setPlanUrl(null);
                    setPoints([]);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-full text-sm text-ns-muted hover:text-ns-text transition-colors"
                >
                  <Trash2 size={14} strokeWidth={1.6} /> Очистить план
                </button>
              )}
              {points.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPoints([])}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-full text-sm text-ns-muted hover:text-ns-text transition-colors ml-auto"
                >
                  <Trash2 size={14} strokeWidth={1.6} /> Сбросить точки
                </button>
              )}
            </div>
            {error && (
              <p className="text-xs text-red-500 font-medium">{error}</p>
            )}
            <div className="flex flex-col gap-2 min-w-0 sm:flex-row sm:items-end sm:gap-3">
              <div className="min-w-0 flex-1">
                <label className="block text-sm font-semibold text-ns-text mb-2">
                  Площадь объекта, м²
                </label>
                <input
                  type="number"
                  min={10}
                  max={1500}
                  value={targetArea}
                  onChange={(e) => setTargetArea(e.target.value)}
                  className="w-full bg-ns-input rounded-xl px-4 py-3 text-sm text-ns-text focus:outline-none focus:ring-2 focus:ring-ns-accent"
                />
              </div>
              {recommendedDevice && (
                <button
                  type="button"
                  onClick={() => setSelectedProductId(recommendedDevice.id)}
                  className="aurora-button inline-flex w-full shrink-0 items-center justify-center px-4 py-2 text-sm font-medium transition-transform hover:scale-[1.01] sm:w-auto sm:min-w-[11rem]"
                >
                  Выбрать оптимальное
                </button>
              )}
            </div>

            <div className="rounded-xl overflow-hidden ns-chip">
              <canvas
                ref={canvasRef}
                onClick={handleClick}
                className="w-full h-auto cursor-crosshair block"
                style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <Legend color="#34c759" label="Сильный" />
              <Legend color="#ffd60a" label="Средний" />
              <Legend color="#ff9f0a" label="Слабый" />
              <Legend color="#ff453a" label="Очень слабый" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="aurora-card rounded-2xl p-5 space-y-4">
            <p className="text-sm font-semibold text-ns-text">
              Активное устройство
            </p>
            {recommendedDevice && (
              <Link
                to={`/catalog/${recommendedDevice.slug}`}
                className="flex gap-3 p-3 rounded-xl ns-chip hover:bg-ns-hover transition-colors min-w-0"
              >
                <div className="w-12 h-12 rounded-lg ns-thumb flex items-center justify-center shrink-0 overflow-hidden">
                  {recommendedDevice.imageUrl ? (
                    <MediaImage
                      src={recommendedDevice.imageUrl}
                      alt={recommendedDevice.name}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-xs text-ns-muted">—</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-xs overflow-hidden">
                  <p className="font-semibold text-ns-text line-clamp-2 break-words">
                    Рекомендация: {recommendedDevice.brand.name}{" "}
                    {recommendedDevice.name}
                  </p>
                  <p className="text-ns-muted mt-1">
                    {safeTargetArea} м² · в каталог
                  </p>
                </div>
              </Link>
            )}
            <select
              value={selectedProductId ?? ""}
              onChange={(e) => setSelectedProductId(Number(e.target.value))}
              className="w-full bg-ns-input rounded-xl px-4 py-3 text-sm text-ns-text focus:outline-none focus:ring-2 focus:ring-ns-accent appearance-none pr-10"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%236e6e73' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 14px center",
              }}
            >
              <optgroup label="Маршрутизаторы">
                {routers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.brand.name} {r.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Точки доступа">
                {aps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.brand.name} {a.name}
                  </option>
                ))}
              </optgroup>
            </select>
            <p className="text-xs text-ns-muted inline-flex items-center gap-1.5">
              <Plus size={13} strokeWidth={1.6} /> Клик по схеме — новая точка
            </p>
          </div>

          <div className="aurora-card rounded-2xl p-5 min-w-0 overflow-hidden">
            <p className="text-sm font-semibold text-ns-text mb-4">
              Расставленные устройства
            </p>
            {points.length === 0 ? (
              <p className="text-sm text-ns-muted inline-flex items-center gap-1.5">
                <Wifi size={14} strokeWidth={1.6} /> Точек ещё нет
              </p>
            ) : (
              <div className="space-y-2">
                {points.map((p, idx) => {
                  const product = allDevices.find((x) => x.id === p.productId);
                  if (!product) return null;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 p-2.5 rounded-xl ns-chip min-w-0 overflow-hidden"
                    >
                      <Link
                        to={`/catalog/${product.slug}`}
                        className="flex flex-1 min-w-0 items-center gap-3 rounded-lg hover:opacity-90 transition-opacity overflow-hidden"
                      >
                        <div className="w-12 h-12 rounded-lg ns-thumb flex items-center justify-center shrink-0 overflow-hidden">
                          {product.imageUrl ? (
                            <MediaImage
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <span className="text-xs text-ns-muted">—</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden pr-1">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-ns-accent text-ns-accent-fg text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <p className="text-xs font-semibold text-ns-text min-w-0 flex-1 line-clamp-2 break-words leading-snug">
                              {product.name}
                            </p>
                          </div>
                          <p className="text-[11px] text-ns-muted mt-1 pl-8">
                            {formatPrice(product.price)}
                          </p>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={() => removePoint(p.id)}
                        className="p-1.5 rounded-full text-ns-muted hover:text-red-500 transition-colors shrink-0"
                        title="Удалить"
                      >
                        <Trash2 size={14} strokeWidth={1.6} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {grouped.length > 0 && (
              <div className="flex items-center justify-between pt-4 mt-4">
                <span className="text-sm font-semibold text-ns-text">
                  Итого
                </span>
                <span className="text-lg font-semibold text-ns-text">
                  {formatPrice(totalPrice)}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!canAdd || bulkAdd.isPending}
            onClick={() => bulkAdd.mutate()}
            className="ns-btn ns-btn-primary w-full"
          >
            <ShoppingCart size={16} strokeWidth={1.6} />
            {!user
              ? "Войдите, чтобы добавить в корзину"
              : !isCustomer(user)
                ? "Недоступно для администратора"
                : bulkAdd.isPending
                  ? "Добавляем..."
                  : "Добавить в корзину"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-ns-muted">
      <span
        className="w-3 h-3 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}

function signalColor(signal: number): [number, number, number, number] {
  const alpha = 130;
  if (signal >= 0.7) return [52, 199, 89, alpha];
  if (signal >= 0.45) return [255, 214, 10, alpha];
  if (signal >= 0.2) return [255, 159, 10, alpha];
  return [255, 69, 58, Math.round(alpha * 0.7)];
}
