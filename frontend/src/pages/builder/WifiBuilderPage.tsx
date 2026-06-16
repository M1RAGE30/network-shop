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
import { Price } from "../../components/Price";
import { useAuthStore } from "../../store/authStore";
import { isCustomer } from "../../lib/roles";
import { useThemeStore } from "../../store/themeStore";
import MediaImage from "../../components/MediaImage";
import {
  pickBest,
  scoreWifiConstructorRouter,
  wifiCoverageRadiusM,
  wifiHeatmapRadiusPx,
} from "../../lib/networkSelector";
import { themeCanvasColors } from "../../lib/themeColors";
import { inputCls } from "../../lib/uiClasses";
import {
  type BuilderProduct,
  filterWifiBuilderRouters,
  sortBuilderProducts,
} from "../../lib/builderProducts";
import { productSpecSummary } from "../../lib/productSpecSummary";
import BuilderDevicePicker from "../../components/BuilderDevicePicker";

interface PlacedPoint {
  id: string;
  x: number;
  y: number;
  productId: number;
}

const CANVAS_W = 720;
const CANVAS_H = 480;

function prepareWifiCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): boolean {
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  if (cssWidth < 8 || cssHeight < 8) return false;

  const dpr = window.devicePixelRatio || 1;
  const bufferWidth = Math.round(cssWidth * dpr);
  const bufferHeight = Math.round(cssHeight * dpr);
  if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
    canvas.width = bufferWidth;
    canvas.height = bufferHeight;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale((cssWidth * dpr) / CANVAS_W, (cssHeight * dpr) / CANVAS_H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return true;
}

const ZONE_BOUNDARY_RATIOS = [0.3, 0.55, 0.8, 1] as const;

const WIFI_STORAGE_KEY = "wifi-builder-state-v1";

interface SavedWifiBuilderState {
  planUrl: string | null;
  points: PlacedPoint[];
  selectedProductId: number | null;
  targetArea: string;
}

function readSavedWifiBuilder(): SavedWifiBuilderState | null {
  try {
    const raw = window.localStorage.getItem(WIFI_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedWifiBuilderState) : null;
  } catch {
    return null;
  }
}

function writeSavedWifiBuilder(value: SavedWifiBuilderState) {
  try {
    window.localStorage.setItem(WIFI_STORAGE_KEY, JSON.stringify(value));
  } catch {}
}

function fetchCategoryProducts(slug: string) {
  return api
    .get("/products", {
      params: { category: slug, limit: 100, sort: "name-asc" },
    })
    .then((r) => sortBuilderProducts(r.data.products as BuilderProduct[]));
}

export default function WifiBuilderPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { dark } = useThemeStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initialSavedRef = useRef(readSavedWifiBuilder());

  const [planUrl, setPlanUrl] = useState<string | null>(
    () => initialSavedRef.current?.planUrl ?? null,
  );
  const [planImage, setPlanImage] = useState<HTMLImageElement | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    () => initialSavedRef.current?.selectedProductId ?? null,
  );
  const [points, setPoints] = useState<PlacedPoint[]>(
    () => initialSavedRef.current?.points ?? [],
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [targetArea, setTargetArea] = useState(
    () => initialSavedRef.current?.targetArea ?? "120",
  );

  useEffect(() => {
    writeSavedWifiBuilder({
      planUrl,
      points,
      selectedProductId,
      targetArea,
    });
  }, [planUrl, points, selectedProductId, targetArea]);

  const { data: routersRaw = [] } = useQuery({
    queryKey: ["wifi-routers"],
    queryFn: () => fetchCategoryProducts("routers"),
  });

  const routers = useMemo(
    () => filterWifiBuilderRouters(routersRaw),
    [routersRaw],
  );
  const safeTargetArea = useMemo(() => {
    const parsed = Number(targetArea);
    if (!Number.isFinite(parsed) || parsed <= 0) return 120;
    return Math.min(1500, Math.max(10, parsed));
  }, [targetArea]);
  const expectedClients = useMemo(
    () => Math.max(4, Math.round(safeTargetArea / 10)),
    [safeTargetArea],
  );
  const deferredTargetArea = useDeferredValue(safeTargetArea);

  const recommendedDevice = useMemo(
    () =>
      pickBest(
        routers,
        (routerCandidate) =>
          scoreWifiConstructorRouter(
            routerCandidate,
            safeTargetArea,
            expectedClients,
          ),
        "lower_price",
      ) as BuilderProduct | null,
    [routers, expectedClients, safeTargetArea],
  );

  useEffect(() => {
    if (routers.length === 0) return;
    const routerIds = new Set(routers.map((router) => router.id));
    setPoints((prev) => prev.filter((point) => routerIds.has(point.productId)));
    setSelectedProductId((prev) => {
      if (prev != null && routerIds.has(prev)) return prev;
      return recommendedDevice?.id ?? routers[0].id;
    });
  }, [routers, recommendedDevice]);

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
      if (!prepareWifiCanvas(canvas, ctx)) return;

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
        if (points.length === 0) {
          ctx.fillStyle = colors.label;
          ctx.font = "600 14px Inter, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            "Загрузите план или разместите маршрутизаторы",
            CANVAS_W / 2,
            CANVAS_H / 2,
          );
          ctx.textAlign = "start";
          ctx.textBaseline = "alphabetic";
        }
      }

      if (points.length > 0) {
        const sources = points
          .map((p) => {
            const product = routers.find((d) => d.id === p.productId);
            if (!product) return null;
            const range = wifiHeatmapRadiusPx(
              product,
              true,
              deferredTargetArea,
            );
            return { x: p.x, y: p.y, invRange: 1 / Math.max(1, range) };
          })
          .filter(
            (s): s is { x: number; y: number; invRange: number } => s != null,
          );

        if (sources.length > 0) {
          drawSmoothHeatmap(ctx, sources, dark);
        }

        points.forEach((p, idx) => {
          const product = routers.find((d) => d.id === p.productId);
          const radiusPx = product
            ? wifiHeatmapRadiusPx(product, true, deferredTargetArea)
            : 0;
          const radiusM = product ? wifiCoverageRadiusM(product) : 0;
          const px = p.x;
          const py = p.y;

          if (radiusPx > 0) {
            ctx.beginPath();
            ctx.arc(px, py, radiusPx, 0, Math.PI * 2);
            ctx.strokeStyle = dark
              ? "rgba(250, 250, 250, 0.35)"
              : "rgba(9, 9, 11, 0.25)";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            const labelFont = 12;
            ctx.font = `700 ${labelFont}px Inter, system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + radiusPx, py);
            ctx.strokeStyle = dark
              ? "rgba(250, 250, 250, 0.45)"
              : "rgba(9, 9, 11, 0.35)";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            ZONE_BOUNDARY_RATIOS.forEach((ratio) => {
              const meters = Math.max(1, Math.round(radiusM * ratio));
              const dist = radiusPx * ratio;
              const lx = clamp(px + dist, 32, CANVAS_W - 32);
              const ly = clamp(py, 18, CANVAS_H - 18);
              const label = `${meters} м`;
              const tw = ctx.measureText(label).width;
              const padX = 6;
              const padY = 4;
              const boxW = tw + padX * 2;
              const boxH = labelFont + padY * 2;
              ctx.fillStyle = dark
                ? "rgba(9, 9, 11, 0.92)"
                : "rgba(255, 255, 255, 0.96)";
              ctx.strokeStyle = dark
                ? "rgba(250, 250, 250, 0.35)"
                : "rgba(9, 9, 11, 0.2)";
              ctx.lineWidth = 1;
              const bx = lx - boxW / 2;
              const by = ly - boxH / 2;
              ctx.beginPath();
              ctx.roundRect(bx, by, boxW, boxH, 4);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = dark ? "#fafafa" : "#09090b";
              ctx.fillText(label, lx, ly);
            });

            ctx.textAlign = "start";
            ctx.textBaseline = "alphabetic";
          }

          ctx.beginPath();
          ctx.arc(px, py, 12, 0, Math.PI * 2);
          ctx.fillStyle = colors.accent;
          ctx.fill();
          ctx.strokeStyle = colors.accentFg;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = colors.accentFg;
          ctx.font = "bold 11px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(idx + 1), px, py + 1);
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

    const canvas = canvasRef.current;
    const resizeObserver =
      canvas && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedule)
        : null;
    if (canvas && resizeObserver) {
      resizeObserver.observe(canvas);
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
    };
  }, [points, planImage, dark, deferredTargetArea, routers]);

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
    const x = clamp(((e.clientX - rect.left) / rect.width) * CANVAS_W, 0, CANVAS_W);
    const y = clamp(((e.clientY - rect.top) / rect.height) * CANVAS_H, 0, CANVAS_H);
    const product = routers.find((p) => p.id === selectedProductId);
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
    const map = new Map<number, { product: BuilderProduct; quantity: number }>();
    for (const p of points) {
      const existing = map.get(p.productId);
      const product = routers.find((x) => x.id === p.productId);
      if (!product) continue;
      if (existing) existing.quantity++;
      else map.set(p.productId, { product, quantity: 1 });
    }
    return Array.from(map.values());
  }, [points, routers]);

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
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(
        err.response?.data?.message ?? "Не удалось добавить товары в корзину",
      );
    },
  });

  const canAdd = isCustomer(user) && grouped.length > 0;

  return (
    <div className="w-full min-w-0 mx-auto pb-10">
      <div className="text-center mb-8">
        <h1 className="ns-page-hero__title text-3xl sm:text-4xl font-semibold text-ns-text">
          Конструктор Wi‑Fi покрытия
        </h1>
        <p className="text-sm text-ns-muted mt-2">
          План помещения, расстановка оборудования и оценка зоны покрытия
        </p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] gap-5">
        <div className="space-y-4">
          <div className="aurora-card rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-btn)] ns-chip hover:bg-ns-hover text-sm font-medium text-ns-text cursor-pointer transition-colors">
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
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-btn)] text-sm text-ns-muted hover:text-ns-text hover:bg-ns-hover transition-colors"
                >
                  <Trash2 size={14} strokeWidth={1.6} /> Очистить план
                </button>
              )}
              {points.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPoints([])}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-btn)] text-sm text-ns-muted hover:text-ns-text hover:bg-ns-hover transition-colors ml-auto"
                >
                  <Trash2 size={14} strokeWidth={1.6} /> Сбросить размещение
                </button>
              )}
            </div>
            {error && (
              <p className="text-xs text-ns-error font-medium">{error}</p>
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
                  className={inputCls}
                />
              </div>
              {recommendedDevice && (
                <button
                  type="button"
                  onClick={() => setSelectedProductId(recommendedDevice.id)}
                  className="aurora-button inline-flex w-full shrink-0 items-center justify-center px-4 py-2 text-sm font-medium transition-transform hover:scale-[1.01] sm:w-auto sm:min-w-[11rem]"
                >
                  Применить рекомендацию
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
              Маршрутизатор для размещения
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
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-ns-muted">–</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-xs overflow-hidden">
                  <p className="font-semibold text-ns-text line-clamp-2 break-words">
                    Рекомендация: {recommendedDevice.brand.name}{" "}
                    {recommendedDevice.name}
                  </p>
                  <p className="text-ns-muted mt-1 line-clamp-2 leading-snug">
                    {productSpecSummary(recommendedDevice)}
                  </p>
                </div>
              </Link>
            )}
            <BuilderDevicePicker
              routers={routers}
              accessPoints={[]}
              value={selectedProductId}
              onChange={setSelectedProductId}
            />
            <p className="text-xs text-ns-muted inline-flex items-center gap-1.5">
              <Plus size={13} strokeWidth={1.6} /> Щелчок по схеме добавляет маршрутизатор
            </p>
          </div>

          <div className="aurora-card rounded-2xl p-5 min-w-0 overflow-hidden">
            <p className="text-sm font-semibold text-ns-text mb-4">
              Размещённые маршрутизаторы
            </p>
            {points.length === 0 ? (
              <p className="text-sm text-ns-muted inline-flex items-center gap-1.5">
                <Wifi size={14} strokeWidth={1.6} /> Маршрутизаторы не размещены
              </p>
            ) : (
              <div className="space-y-2">
                {points.map((p, idx) => {
                  const product = routers.find((x) => x.id === p.productId);
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
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-ns-muted">–</span>
                          )}
                        </div>
                        <span className="ns-num-badge shrink-0 bg-ns-accent text-ns-accent-fg">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1 overflow-hidden pr-1">
                          <p className="text-xs font-semibold text-ns-text line-clamp-2 break-words leading-snug">
                            {product.name}
                          </p>
                          <p className="text-[11px] text-ns-muted mt-0.5 line-clamp-2 leading-snug">
                            {productSpecSummary(product)}
                          </p>
                          <p className="text-xs text-ns-muted mt-1 sm:text-sm">
                            <Price value={product.price} />
                          </p>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={() => removePoint(p.id)}
                        className="ns-action-icon ns-action-icon--danger shrink-0"
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
                  <Price value={totalPrice} />
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

const WIFI_ZONE_ALPHA = 130 / 255;

function drawSmoothHeatmap(
  ctx: CanvasRenderingContext2D,
  sources: { x: number; y: number; invRange: number }[],
  dark: boolean,
) {
  const a = WIFI_ZONE_ALPHA;
  const aWeak = a * 0.7;

  ctx.save();
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  ctx.globalAlpha = 0.62;

  for (const src of sources) {
    const r = 1 / src.invRange;
    const grad = ctx.createRadialGradient(src.x, src.y, 0, src.x, src.y, r);
    grad.addColorStop(0, `rgba(52, 199, 89, ${a})`);
    grad.addColorStop(0.3, `rgba(52, 199, 89, ${a})`);
    grad.addColorStop(0.32, `rgba(255, 214, 10, ${a})`);
    grad.addColorStop(0.55, `rgba(255, 214, 10, ${a})`);
    grad.addColorStop(0.56, `rgba(255, 159, 10, ${a})`);
    grad.addColorStop(0.8, `rgba(255, 159, 10, ${a})`);
    grad.addColorStop(0.82, `rgba(255, 69, 58, ${a})`);
    grad.addColorStop(1, `rgba(255, 69, 58, ${aWeak})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(src.x, src.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
