import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Calculator, ShoppingCart } from "lucide-react";
import api from "../../lib/api";
import { formatPrice } from "../../lib/format";
import { useAuthStore } from "../../store/authStore";
import { isCustomer } from "../../lib/roles";
import MediaImage from "../../components/MediaImage";
import {
  pickBest,
  scoreAdapter,
  scoreRouter,
  scoreSwitch,
  scoreWifiConstructorAp,
  getCoverageM2,
  getPortCount,
  hasPoe,
  type ProductSelectorInput,
} from "../../lib/networkSelector";
import { inputCls as fieldCls, labelCls } from "../../lib/uiClasses";
import { themeCanvasColors } from "../../lib/themeColors";

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  imageUrl: string | null;
  brand: { name: string };
  category: { name: string; slug: string };
  specs?: Record<string, string> | null;
}

interface FormState {
  width: string;
  length: string;
  wired: string;
  wireless: string;
  printers: string;
  spaceType: "office" | "home";
}

interface RecommendedItem {
  product: Product;
  quantity: number;
  reason: string;
}

interface ClientPlacement {
  x: number;
  y: number;
  type: string;
}

interface ApMarker {
  x: number;
  y: number;
}

interface CableConnection {
  from: string;
  to: string;
  lengthM: number;
}

interface SceneState {
  router: { x: number; y: number };
  switch: { x: number; y: number } | null;
  clients: ClientPlacement[];
  apMarkers: ApMarker[];
  apRadiusM: number;
  routerRadiusM: number;
}

interface SavedModeState {
  sceneKey: string;
  scene: SceneState;
  showCalculated: boolean;
}

interface SavedBuilderState {
  form: FormState;
  modes: Partial<Record<FormState["spaceType"], SavedModeState>>;
}

const DEFAULT_FORM: FormState = {
  width: "10",
  length: "8",
  wired: "5",
  wireless: "8",
  printers: "1",
  spaceType: "office",
};

const STORAGE_KEY = "network-builder-state-v2";

function readSavedBuilder(): SavedBuilderState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedBuilderState) : null;
  } catch {
    return null;
  }
}

function writeSavedBuilder(value: SavedBuilderState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {}
}

function radiusFromCoverageM(product: ProductSelectorInput): number {
  return Math.max(2, Math.sqrt(getCoverageM2(product) / Math.PI));
}

function scoreRouterLayoutFit(
  product: ProductSelectorInput,
  scene: SceneState,
): number {
  const r = radiusFromCoverageM(product);
  const phones = scene.clients.filter((c) => c.type === "📱");
  if (phones.length === 0) return 5;
  let sum = 0;
  for (const ph of phones) {
    const d = Math.hypot(ph.x - scene.router.x, ph.y - scene.router.y);
    if (d <= r) sum += 1;
    else sum += clamp(1 - (d - r) / Math.max(d, 0.25), 0, 1) * 0.4;
  }
  return (sum / phones.length) * 28;
}

function scoreApLayoutFit(
  product: ProductSelectorInput,
  scene: SceneState,
  routerRadiusM: number,
): number {
  const rAp = radiusFromCoverageM(product);
  const phones = scene.clients.filter((c) => c.type === "📱");
  if (phones.length === 0) return 6;
  const outside = phones.filter(
    (ph) =>
      Math.hypot(ph.x - scene.router.x, ph.y - scene.router.y) >
      routerRadiusM,
  );
  if (outside.length === 0) return 12;
  if (scene.apMarkers.length === 0) return 0;
  let ok = 0;
  for (const ph of outside) {
    const nearest = Math.min(
      ...scene.apMarkers.map((ap) =>
        Math.hypot(ph.x - ap.x, ph.y - ap.y),
      ),
    );
    if (nearest <= rAp) ok += 1;
  }
  return (ok / outside.length) * 30;
}

function scoreSwitchLayoutFit(
  product: ProductSelectorInput,
  scene: SceneState,
): number {
  if (!scene.switch) return 0;
  const sx = scene.switch.x;
  const sy = scene.switch.y;
  let maxD = 0;
  for (const ap of scene.apMarkers) {
    maxD = Math.max(maxD, Math.hypot(ap.x - sx, ap.y - sy));
  }
  for (const c of scene.clients) {
    if (c.type === "📱") continue;
    maxD = Math.max(maxD, Math.hypot(c.x - sx, c.y - sy));
  }
  if (maxD < 14) return 0;
  if (!hasPoe(product)) return 0;
  return Math.min(12, (maxD - 14) * 0.15);
}

const MAX_DEVICES = 200;
const ROOM_MARGIN_M = 0.42;

const SWITCH_EMOJI = "\u{1F5A7}";

function fetchCategoryProducts(slug: string) {
  return api
    .get("/products", { params: { category: slug, limit: 100, sort: "price-asc" } })
    .then((r) => r.data.products as Product[]);
}

function clampInt(value: string, min: number, max: number): number {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function clampToRoom(
  x: number,
  y: number,
  width: number,
  length: number,
): { x: number; y: number } {
  return {
    x: clamp(x, ROOM_MARGIN_M, width - ROOM_MARGIN_M),
    y: clamp(y, ROOM_MARGIN_M, length - ROOM_MARGIN_M),
  };
}

function buildInitialClientPlacements(
  numbers: {
    width: number;
    length: number;
    wired: number;
    wireless: number;
    printers: number;
  },
): ClientPlacement[] {
  const W = numbers.wired;
  const P = numbers.printers;
  const WL = numbers.wireless;
  const clients: { type: string }[] = [
    ...Array.from({ length: W }, () => ({ type: "💻" })),
    ...Array.from({ length: P }, () => ({ type: "🖨️" })),
    ...Array.from({ length: WL }, () => ({ type: "📱" })),
  ];
  const sum = clients.length;
  const out: ClientPlacement[] = [];
  if (sum === 0) return out;

  const padX = numbers.width * 0.06;
  const padYTop = numbers.length * 0.2;
  const padYBottom = numbers.length * 0.05;
  const workW = numbers.width - padX * 2;
  const workH = numbers.length - padYTop - padYBottom;

  let cols = Math.ceil(Math.sqrt(sum * (workW / (workH || 1))));
  cols = Math.max(1, Math.min(sum, cols));
  const rows = Math.ceil(sum / cols);

  const cellW = workW / cols;
  const cellH = workH / rows;

  const startX = padX + cellW / 2;
  const startY = padYTop + cellH / 2;

  for (let i = 0; i < sum; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const p = clampToRoom(
      startX + col * cellW,
      startY + row * cellH,
      numbers.width,
      numbers.length,
    );
    out.push({ x: p.x, y: p.y, type: clients[i].type });
  }
  return out;
}

function nudgeApAway(
  x: number,
  y: number,
  avoid: { x: number; y: number }[],
): { x: number; y: number } {
  let nx = x;
  let ny = y;
  for (let step = 0; step < 12; step++) {
    const clash = avoid.some((p) => Math.hypot(p.x - nx, p.y - ny) < 1.35);
    if (!clash) return { x: nx, y: ny };
    nx += 0.85;
    ny += step % 2 === 0 ? 0.45 : -0.35;
  }
  return { x, y };
}

function computeApMarkers(
  clients: ClientPlacement[],
  router: { x: number; y: number },
  routerRadiusM: number,
  apRadiusM: number,
  numbers: { width: number; length: number },
): ApMarker[] {
  const apMarkers: ApMarker[] = [];
  let uncovered = clients.filter(
    (c) =>
      c.type === "📱" && Math.hypot(c.x - router.x, c.y - router.y) > routerRadiusM,
  );

  const MAX_AP = 40;
  while (uncovered.length > 0 && apMarkers.length < MAX_AP) {
    let bestCenter = uncovered[0];
    let maxCovered = 0;
    for (const candidate of uncovered) {
      const coveredCount = uncovered.filter(
        (p) => Math.hypot(p.x - candidate.x, p.y - candidate.y) <= apRadiusM,
      ).length;
      if (coveredCount > maxCovered) {
        maxCovered = coveredCount;
        bestCenter = candidate;
      }
    }
    const cluster = uncovered.filter(
      (p) => Math.hypot(p.x - bestCenter.x, p.y - bestCenter.y) <= apRadiusM,
    );
    const apx = cluster.reduce((s, p) => s + p.x, 0) / Math.max(1, cluster.length);
    const apy = cluster.reduce((s, p) => s + p.y, 0) / Math.max(1, cluster.length);
    const avoidIcons = clients.filter((c) => c.type !== "📱");
    const nudged = nudgeApAway(apx, apy, [...avoidIcons, router]);
    const q = clampToRoom(nudged.x, nudged.y, numbers.width, numbers.length);
    apMarkers.push({ x: q.x, y: q.y });
    uncovered = uncovered.filter((p) => Math.hypot(p.x - q.x, p.y - q.y) > apRadiusM);
  }

  return apMarkers;
}

function getPatchCordLengthM(product: Product): number | null {
  const specs = product.specs ?? {};
  const text = [product.name, ...Object.entries(specs).flat()].join(" ").toLowerCase();
  const direct = text.match(/(?:длина кабеля|длина)\D{0,18}(\d+(?:[,.]\d+)?)\s*м/);
  const generic = text.match(/(\d+(?:[,.]\d+)?)\s*м\b/);
  const value = Number((direct?.[1] ?? generic?.[1] ?? "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function computeCableConnections(scene: SceneState): CableConnection[] {
  if (!scene.switch) return [];
  const connections: CableConnection[] = [];
  const lengthWithSlack = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.max(1, Math.ceil((Math.hypot(a.x - b.x, a.y - b.y) * 1.15 + 0.5) * 10) / 10);

  connections.push({
    from: "Роутер",
    to: "Коммутатор",
    lengthM: lengthWithSlack(scene.router, scene.switch),
  });

  scene.clients.forEach((client, index) => {
    if (client.type === "📱") return;
    connections.push({
      from: "Коммутатор",
      to: client.type === "🖨️" ? `Периферия ${index + 1}` : `ПК ${index + 1}`,
      lengthM: lengthWithSlack(scene.switch!, client),
    });
  });

  scene.apMarkers.forEach((ap, index) => {
    connections.push({
      from: "Коммутатор",
      to: `Точка доступа ${index + 1}`,
      lengthM: lengthWithSlack(scene.switch!, ap),
    });
  });

  return connections;
}

function pickPatchCordForLength(products: Product[], requiredM: number): Product | null {
  const candidates = products
    .map((product) => ({ product, length: getPatchCordLengthM(product) }))
    .filter((entry): entry is { product: Product; length: number } => entry.length !== null);

  const bigger = candidates
    .filter((entry) => entry.length >= requiredM)
    .sort((a, b) => a.length - b.length || Number(a.product.price) - Number(b.product.price));
  if (bigger[0]) return bigger[0].product;

  return (
    candidates.sort(
      (a, b) => b.length - a.length || Number(a.product.price) - Number(b.product.price),
    )[0]?.product ?? null
  );
}

function buildSceneState(
  numbers: {
    width: number;
    length: number;
    wired: number;
    wireless: number;
    printers: number;
  },
  area: number,
  spaceType: "office" | "home",
  routers: Product[],
  aps: Product[],
): SceneState {
  const clients = buildInitialClientPlacements(numbers);
  const totalWired = numbers.wired + numbers.printers;
  const totalClients = totalWired + numbers.wireless;

  const routerProduct = pickBest(
    routers,
    (r) =>
      scoreRouter(r, {
        totalClients,
        wiredClients: totalWired,
        area,
        spaceType,
      }),
    "lower_price",
  ) as Product | null;

  const routerRadiusM = routerProduct
    ? Math.max(2, Math.sqrt(getCoverageM2(routerProduct) / Math.PI))
    : 7;

  const router = clampToRoom(
    numbers.width * 0.28,
    numbers.length * 0.12,
    numbers.width,
    numbers.length,
  );

  let apRadiusM = 5;

  if (numbers.wireless > 0 && aps.length > 0) {
    const clientsPerApEst = Math.max(2, Math.ceil(numbers.wireless / 3));
    const bestAp = pickBest(
      aps,
      (apCandidate) =>
        scoreWifiConstructorAp(apCandidate, area, clientsPerApEst),
      "lower_price",
    ) as Product | null;
    const referenceCoverage = bestAp ? getCoverageM2(bestAp) : 100;
    apRadiusM = Math.max(2, Math.sqrt(referenceCoverage / Math.PI));
  }

  const needsSwitch =
    numbers.wired + numbers.printers >= 1;
  const sw = needsSwitch
    ? clampToRoom(
        numbers.width * 0.72,
        numbers.length * 0.12,
        numbers.width,
        numbers.length,
      )
    : null;

  return {
    router,
    switch: sw,
    clients,
    apMarkers: [],
    apRadiusM,
    routerRadiusM,
  };
}

interface RoomGeom {
  rx: number;
  ry: number;
  roomW: number;
  roomH: number;
  ppm: number;
}

function getRoomGeometry(
  canvas: HTMLCanvasElement,
  numbers: { width: number; length: number },
): RoomGeom | null {
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  if (cssWidth < 8 || cssHeight < 8) return null;
  const padding = 32;
  const roomRatio = numbers.width / numbers.length;
  const availW = cssWidth - padding * 2;
  const availH = cssHeight - padding * 2;
  let roomW = availW;
  let roomH = availW / roomRatio;
  if (roomH > availH) {
    roomH = availH;
    roomW = availH * roomRatio;
  }
  const rx = (cssWidth - roomW) / 2;
  const ry = (cssHeight - roomH) / 2;
  return { rx, ry, roomW, roomH, ppm: roomW / numbers.width };
}

type DragKind = "router" | "switch" | "client" | "ap";

interface DragState {
  kind: DragKind;
  index: number;
  grabDx: number;
  grabDy: number;
}

export default function NetworkBuilderPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const initialSavedRef = useRef<SavedBuilderState | null>(readSavedBuilder());

  const [form, setForm] = useState<FormState>(
    () => initialSavedRef.current?.form ?? DEFAULT_FORM,
  );

  const [scene, setScene] = useState<SceneState | null>(() => {
    const saved = initialSavedRef.current;
    const mode = saved?.form?.spaceType ?? DEFAULT_FORM.spaceType;
    return saved?.modes?.[mode]?.scene ?? null;
  });
  const [showCalculated, setShowCalculated] = useState(() => {
    const saved = initialSavedRef.current;
    const mode = saved?.form?.spaceType ?? DEFAULT_FORM.spaceType;
    return saved?.modes?.[mode]?.showCalculated ?? false;
  });

  const { data: routers = [] } = useQuery({
    queryKey: ["builder-routers"],
    queryFn: () => fetchCategoryProducts("routers"),
  });
  const { data: switches = [] } = useQuery({
    queryKey: ["builder-switches"],
    queryFn: () => fetchCategoryProducts("switches"),
  });
  const { data: aps = [] } = useQuery({
    queryKey: ["builder-aps"],
    queryFn: () => fetchCategoryProducts("access-points"),
  });
  const { data: adapters = [] } = useQuery({
    queryKey: ["builder-usb"],
    queryFn: () => fetchCategoryProducts("usb-adapters"),
  });
  const { data: patchCords = [] } = useQuery({
    queryKey: ["builder-patch-cords"],
    queryFn: () =>
      api
        .get("/products", {
          params: { search: "Патч-корд", limit: 100, sort: "price-asc" },
        })
        .then((r) => r.data.products as Product[]),
  });

  const numbers = useMemo(() => {
    return {
      width: clampInt(form.width, 2, 200),
      length: clampInt(form.length, 2, 200),
      wired: clampInt(form.wired, 0, MAX_DEVICES),
      wireless: clampInt(form.wireless, 0, MAX_DEVICES),
      printers: clampInt(form.printers, 0, 50),
    };
  }, [form]);

  const area = numbers.width * numbers.length;

  const sceneKey = useMemo(
    () =>
      `${numbers.width}x${numbers.length}x${numbers.wired}x${numbers.wireless}x${numbers.printers}x${form.spaceType}`,
    [
      numbers.width,
      numbers.length,
      numbers.wired,
      numbers.wireless,
      numbers.printers,
      form.spaceType,
    ],
  );

  useEffect(() => {
    const saved = readSavedBuilder()?.modes?.[form.spaceType];
    if (saved?.sceneKey === sceneKey) {
      setScene(saved.scene);
      setShowCalculated(saved.showCalculated);
      return;
    }
    setScene(buildSceneState(numbers, area, form.spaceType, routers, aps));
    setShowCalculated(false);
  }, [sceneKey, area, form.spaceType, routers, aps]);

  useEffect(() => {
    if (!scene) return;
    const saved = readSavedBuilder() ?? { form, modes: {} };
    writeSavedBuilder({
      form,
      modes: {
        ...saved.modes,
        [form.spaceType]: {
          sceneKey,
          scene,
          showCalculated,
        },
      },
    });
  }, [form, scene, sceneKey, showCalculated]);

  const resetLayout = useCallback(() => {
    const saved = readSavedBuilder();
    if (saved) {
      const modes = { ...saved.modes };
      delete modes[form.spaceType];
      writeSavedBuilder({ form, modes });
    }
    setScene(buildSceneState(numbers, area, form.spaceType, routers, aps));
    setShowCalculated(false);
  }, [numbers, area, form.spaceType, routers, aps]);

  const calculateLayout = useCallback(() => {
    setScene((prev) => {
      const base =
        prev ?? buildSceneState(numbers, area, form.spaceType, routers, aps);
      const totalWired = numbers.wired + numbers.printers;
      const totalClients = totalWired + numbers.wireless;
      const routerProduct = pickBest(
        routers,
        (routerCandidate) =>
          scoreRouter(routerCandidate, {
            totalClients,
            wiredClients: totalWired,
            area,
            spaceType: form.spaceType,
          }) + scoreRouterLayoutFit(routerCandidate, base),
        "lower_price",
      ) as Product | null;
      const nextRouterRadiusM = routerProduct
        ? Math.max(2, Math.sqrt(getCoverageM2(routerProduct) / Math.PI))
        : base.routerRadiusM;
      const clientsPerApEst = Math.max(2, Math.ceil(numbers.wireless / 3));
      const bestAp = pickBest(
        aps,
        (apCandidate) =>
          scoreWifiConstructorAp(apCandidate, area, clientsPerApEst),
        "lower_price",
      ) as Product | null;
      const nextApRadiusM = bestAp
        ? Math.max(2, Math.sqrt(getCoverageM2(bestAp) / Math.PI))
        : base.apRadiusM;
      const apMarkers =
        numbers.wireless > 0 && aps.length > 0
          ? computeApMarkers(
              base.clients,
              base.router,
              nextRouterRadiusM,
              nextApRadiusM,
              numbers,
            )
          : [];
      const switchNeeded = numbers.wired + numbers.printers + apMarkers.length >= 1;
      const sw =
        base.switch ??
        (switchNeeded
          ? clampToRoom(
              numbers.width * 0.72,
              numbers.length * 0.12,
              numbers.width,
              numbers.length,
            )
          : null);
      return {
        ...base,
        switch: switchNeeded ? sw : null,
        apMarkers,
        apRadiusM: nextApRadiusM,
        routerRadiusM: nextRouterRadiusM,
      };
    });
    setShowCalculated(true);
  }, [numbers, area, form.spaceType, routers, aps]);

  const kit = useMemo(() => {
    if (!scene || !showCalculated) {
      return {
        recommendation: [] as RecommendedItem[],
        routerRadiusM: scene?.routerRadiusM ?? 7,
        cableConnections: [] as CableConnection[],
      };
    }

    const items: RecommendedItem[] = [];
    const totalWired = numbers.wired + numbers.printers;
    const totalClients = totalWired + numbers.wireless;

    const router = pickBest(
      routers,
      (routerCandidate) =>
        scoreRouter(routerCandidate, {
          totalClients,
          wiredClients: totalWired,
          area,
          spaceType: form.spaceType,
        }) + scoreRouterLayoutFit(routerCandidate, scene),
      "lower_price",
    ) as Product | null;

    if (router) {
      items.push({
        product: router,
        quantity: 1,
        reason:
          "Основной маршрутизатор: площадь, нагрузка и насколько выбранная модель закрывает беспроводных клиентов с текущего места роутера на схеме.",
      });
    }

    const routerRadiusM = router
      ? Math.max(2, Math.sqrt(getCoverageM2(router) / Math.PI))
      : 7;

    const apsCount = scene.apMarkers.length;
    const cableConnections = computeCableConnections(scene);
    const lanDevices = numbers.wired + numbers.printers + apsCount;
    const baseLanPorts = lanDevices > 0 ? lanDevices + 1 : 0;
    const portHeadroom = Math.max(3, Math.ceil(baseLanPorts * 0.22));
    const portsNeeded = baseLanPorts + portHeadroom;

    if (baseLanPorts >= 1 && switches.length > 0) {
      const eligible = switches.filter(
        (sw) => getPortCount(sw) >= portsNeeded,
      );
      const pool = eligible.length > 0 ? eligible : switches;
      const sw = pickBest(
        pool,
        (switchCandidate) => {
          let s =
            scoreSwitch(switchCandidate, {
              portsNeeded,
              preferManaged:
                numbers.wired + numbers.printers >= 10 ||
                form.spaceType === "office",
              office: form.spaceType === "office",
            }) + scoreSwitchLayoutFit(switchCandidate, scene);
          const ports = getPortCount(switchCandidate);
          if (eligible.length === 0 && ports < portsNeeded) {
            return s - (portsNeeded - ports) * 4;
          }
          return s;
        },
        "lower_price",
      ) as Product | null;
      if (sw) {
        const insertAt = router ? 1 : 0;
        items.splice(insertAt, 0, {
          product: sw,
          quantity: 1,
          reason: `Коммутатор: ПК ${numbers.wired}, принтеры/периферия ${numbers.printers}, точки доступа ${apsCount}; с запасом — не менее ${portsNeeded} портов (в карточке — ${getPortCount(sw)}). Дополнительно учтены расстояния на схеме до ТД и проводных устройств (PoE при длинных линиях к точкам).`,
        });
      }
    }

    if (numbers.wireless > 0 && aps.length > 0) {
      const clientsPerApEst = Math.max(2, Math.ceil(numbers.wireless / 3));
      const bestAp = pickBest(
        aps,
        (apCandidate) =>
          scoreWifiConstructorAp(apCandidate, area, clientsPerApEst) +
          scoreApLayoutFit(apCandidate, scene, routerRadiusM),
        "lower_price",
      ) as Product | null;
      const referenceCoverage = bestAp ? getCoverageM2(bestAp) : 100;
      const apRadiusM = Math.max(2, Math.sqrt(referenceCoverage / Math.PI));
      if (bestAp && apsCount > 0) {
        items.push({
          product: bestAp,
          quantity: apsCount,
          reason: `Точки доступа: радиус в расчёте ~${Math.round(apRadiusM)} м; модель подобрана с учётом того, насколько её зона закрывает беспроводных клиентов вне радиуса роутера относительно расположенных на плане ТД.`,
        });
      }
    }

    if (form.spaceType === "office" && numbers.wireless >= 4) {
      const adapter = pickBest(
        adapters,
        (adapterCandidate) => scoreAdapter(adapterCandidate),
        "lower_price",
      ) as Product | null;
      if (adapter) {
        items.push({
          product: adapter,
          quantity: Math.max(1, Math.floor(numbers.wireless / 4)),
          reason:
            "USB Ethernet: для ПК/ноутбуков без встроенного гигабитного LAN (часто тонкие клиенты).",
        });
      }
    }

    if (patchCords.length > 0 && cableConnections.length > 0) {
      const grouped = new Map<number, { product: Product; quantity: number; maxLength: number }>();
      for (const connection of cableConnections) {
        const cord = pickPatchCordForLength(patchCords, connection.lengthM);
        if (!cord) continue;
        const existing = grouped.get(cord.id);
        if (existing) {
          existing.quantity += 1;
          existing.maxLength = Math.max(existing.maxLength, connection.lengthM);
        } else {
          grouped.set(cord.id, {
            product: cord,
            quantity: 1,
            maxLength: connection.lengthM,
          });
        }
      }
      for (const item of grouped.values()) {
        items.push({
          product: item.product,
          quantity: item.quantity,
          reason: `Патч-корд: ${item.quantity} шт. для реальных проводных соединений на схеме; максимальная расчётная длина с запасом — ${item.maxLength.toFixed(1)} м.`,
        });
      }
    }

    return { recommendation: items, routerRadiusM, cableConnections };
  }, [
    scene,
    showCalculated,
    routers,
    switches,
    aps,
    adapters,
    patchCords,
    numbers,
    area,
    form.spaceType,
  ]);

  const { recommendation, routerRadiusM, cableConnections } = kit;

  const totalPrice = recommendation.reduce(
    (s, i) => s + Number(i.product.price) * i.quantity,
    0,
  );

  const bulkAdd = useMutation({
    mutationFn: () =>
      api.post("/cart/bulk", {
        items: recommendation.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      navigate("/cart");
    },
  });

  const updateScenePos = useCallback(
    (
      kind: DragKind,
      index: number,
      mx: number,
      my: number,
    ) => {
      const p = clampToRoom(mx, my, numbers.width, numbers.length);
      setScene((prev) => {
        if (!prev) return prev;
        if (kind === "router") {
          return { ...prev, router: p };
        }
        if (kind === "switch" && prev.switch) {
          return { ...prev, switch: p };
        }
        if (kind === "client" && index >= 0 && index < prev.clients.length) {
          const clients = [...prev.clients];
          clients[index] = { ...clients[index], x: p.x, y: p.y };
          return { ...prev, clients };
        }
        if (kind === "ap" && index >= 0 && index < prev.apMarkers.length) {
          const apMarkers = [...prev.apMarkers];
          apMarkers[index] = { x: p.x, y: p.y };
          return { ...prev, apMarkers };
        }
        return prev;
      });
    },
    [numbers.width, numbers.length],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scene) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const paint = () => {
      const cssWidth = canvas.clientWidth;
      const cssHeight = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, cssWidth, cssHeight);

      const g = getRoomGeometry(canvas, numbers);
      if (!g) return;
      const { rx, ry, roomW, roomH, ppm: pixelsPerMeter } = g;

      const isDark = document.documentElement.classList.contains("dark");
      const colors = themeCanvasColors(isDark);
      const wallColor = colors.wall;
      const fillColor = colors.fill;
      const labelColor = colors.label;
      const glow = isDark ? "250,250,250" : "9,9,11";

      ctx.fillStyle = fillColor;
      ctx.fillRect(rx, ry, roomW, roomH);

      ctx.save();
      ctx.beginPath();
      ctx.rect(rx, ry, roomW, roomH);
      ctx.clip();

      const apGlowCapPx = Math.min(roomW * 0.11, roomH * 0.11, 88);

      for (const ap of scene.apMarkers) {
        const px = rx + ap.x * pixelsPerMeter;
        const py = ry + ap.y * pixelsPerMeter;
        const rPx = Math.min(scene.apRadiusM * pixelsPerMeter, apGlowCapPx);

        const grad = ctx.createRadialGradient(px, py, 0, px, py, rPx);
        grad.addColorStop(0, `rgba(${glow}, 0.16)`);
        grad.addColorStop(1, `rgba(${glow}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, rPx, 0, Math.PI * 2);
        ctx.fill();
      }

      const cx = rx + scene.router.x * pixelsPerMeter;
      const cy = ry + scene.router.y * pixelsPerMeter;
      const rRadPx = routerRadiusM * pixelsPerMeter;

      const rGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rRadPx);
      rGrad.addColorStop(0, `rgba(${glow}, 0.22)`);
      rGrad.addColorStop(1, `rgba(${glow}, 0)`);
      ctx.fillStyle = rGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, rRadPx, 0, Math.PI * 2);
      ctx.fill();

      if (scene.clients.length > 0) {
        const n = Math.min(100, scene.clients.length);
        const omitted = scene.clients.length - n;

        const workW = roomW - roomW * 0.1;
        const sum = scene.clients.length;
        const cols = Math.max(1, Math.ceil(Math.sqrt(sum * (roomW / (roomH || 1)))));
        const cellW = workW / cols;
        const fontPx = Math.min(24, Math.max(10, cellW * 0.7));

        ctx.font = `${fontPx}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (let i = 0; i < n; i++) {
          const c = scene.clients[i];
          const px = rx + c.x * pixelsPerMeter;
          const py = ry + c.y * pixelsPerMeter;
          ctx.fillText(c.type, px, py);
        }

        if (omitted > 0) {
          ctx.textAlign = "right";
          ctx.textBaseline = "alphabetic";
          ctx.font = "11px Inter, sans-serif";
          ctx.fillStyle = labelColor;
          ctx.fillText(`+${omitted}`, rx + roomW - 8, ry + roomH - 8);
        }
      }

      for (const ap of scene.apMarkers) {
        const px = rx + ap.x * pixelsPerMeter;
        const py = ry + ap.y * pixelsPerMeter;
        ctx.fillStyle = colors.success;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      ctx.lineWidth = 3;
      ctx.strokeStyle = wallColor;
      ctx.strokeRect(rx, ry, roomW, roomH);

      if (showCalculated && scene.switch) {
        const sx = rx + scene.switch.x * pixelsPerMeter;
        const sy = ry + scene.switch.y * pixelsPerMeter;
        const drawCable = (
          ax: number,
          ay: number,
          bx: number,
          by: number,
          dashed = true,
        ) => {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.strokeStyle = dashed
            ? isDark
              ? "rgba(67,223,245,0.34)"
              : "rgba(22,119,255,0.28)"
            : isDark
              ? "rgba(100,255,208,0.58)"
              : "rgba(22,119,255,0.48)";
          ctx.lineWidth = dashed ? 1.2 : 2.2;
          if (dashed) ctx.setLineDash([5, 6]);
          ctx.stroke();
          ctx.restore();
        };
        drawCable(cx, cy, sx, sy, false);
        scene.clients.forEach((client) => {
          if (client.type === "📱") return;
          drawCable(sx, sy, rx + client.x * pixelsPerMeter, ry + client.y * pixelsPerMeter);
        });
        scene.apMarkers.forEach((ap) => {
          drawCable(sx, sy, rx + ap.x * pixelsPerMeter, ry + ap.y * pixelsPerMeter);
        });
      }

      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.accentFg;
      ctx.font = "bold 12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("R", cx, cy + 1);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";

      if (scene.switch) {
        const sx2 = rx + scene.switch.x * pixelsPerMeter;
        const sy2 = ry + scene.switch.y * pixelsPerMeter;
        ctx.font =
          '22px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = colors.router;
        ctx.fillText(SWITCH_EMOJI, sx2, sy2);
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
      }

      ctx.fillStyle = labelColor;
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${numbers.width} м`, rx + roomW / 2, ry - 12);
      ctx.save();
      ctx.translate(rx - 12, ry + roomH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${numbers.length} м`, 0, 0);
      ctx.restore();

    };

    paint();
    window.addEventListener("resize", paint);
    return () => window.removeEventListener("resize", paint);
  }, [numbers, scene, showCalculated, routerRadiusM]);

  const pickDragTarget = (
    ex: number,
    ey: number,
    g: RoomGeom,
    s: SceneState,
  ): DragState | null => {
    const hits: { d: number; state: DragState }[] = [];

    const cx = g.rx + s.router.x * g.ppm;
    const cy = g.ry + s.router.y * g.ppm;
    const dR = Math.hypot(ex - cx, ey - cy);
    if (dR < 22) hits.push({ d: dR, state: { kind: "router", index: -1, grabDx: ex - cx, grabDy: ey - cy } });

    if (s.switch) {
      const sx = g.rx + s.switch.x * g.ppm;
      const sy = g.ry + s.switch.y * g.ppm;
      const dS = Math.hypot(ex - sx, ey - sy);
      if (dS < 24) hits.push({ d: dS, state: { kind: "switch", index: -1, grabDx: ex - sx, grabDy: ey - sy } });
    }

    for (let i = 0; i < Math.min(s.clients.length, 100); i++) {
      const c = s.clients[i];
      const px = g.rx + c.x * g.ppm;
      const py = g.ry + c.y * g.ppm;
      const d = Math.hypot(ex - px, ey - py);
      if (d < 22) hits.push({ d, state: { kind: "client", index: i, grabDx: ex - px, grabDy: ey - py } });
    }

    for (let i = 0; i < s.apMarkers.length; i++) {
      const ap = s.apMarkers[i];
      const px = g.rx + ap.x * g.ppm;
      const py = g.ry + ap.y * g.ppm;
      const d = Math.hypot(ex - px, ey - py);
      if (d < 16) hits.push({ d, state: { kind: "ap", index: i, grabDx: ex - px, grabDy: ey - py } });
    }

    if (hits.length === 0) return null;
    hits.sort((a, b) => a.d - b.d);
    return hits[0].state;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!scene) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = getRoomGeometry(canvas, numbers);
    if (!g) return;
    const rect = canvas.getBoundingClientRect();
    const ex = e.clientX - rect.left;
    const ey = e.clientY - rect.top;
    const st = pickDragTarget(ex, ey, g, scene);
    if (!st) return;
    dragRef.current = st;
    canvas.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d || !scene) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = getRoomGeometry(canvas, numbers);
    if (!g) return;
    const rect = canvas.getBoundingClientRect();
    const ex = e.clientX - rect.left;
    const ey = e.clientY - rect.top;
    const mx = (ex - d.grabDx - g.rx) / g.ppm;
    const my = (ey - d.grabDy - g.ry) / g.ppm;
    updateScenePos(d.kind, d.index, mx, my);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const hadDrag = dragRef.current !== null;
    const canvas = canvasRef.current;
    if (canvas && hadDrag) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
      }
    }
    dragRef.current = null;
    if (hadDrag && showCalculated) {
      calculateLayout();
    }
  };

  const update = (key: keyof FormState, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const canAdd = isCustomer(user) && recommendation.length > 0;
  const hasScene = scene !== null;

  return (
    <div className="w-full min-w-0 mx-auto pb-10">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ns-text tracking-tight">
          Конструктор сети
        </h1>
        <p className="text-sm text-ns-muted mt-2">
          Все устройства на плане сразу: перетащите как нужно, затем рассчитайте связи и комплект
        </p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] gap-5">
        <div className="space-y-5">
          <div className="aurora-card rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Длина, м</label>
                <input
                  type="number"
                  min={2}
                  max={200}
                  className={fieldCls}
                  value={form.width}
                  onChange={(e) => update("width", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Ширина, м</label>
                <input
                  type="number"
                  min={2}
                  max={200}
                  className={fieldCls}
                  value={form.length}
                  onChange={(e) => update("length", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Проводных ПК</label>
                <input
                  type="number"
                  min={0}
                  max={MAX_DEVICES}
                  className={fieldCls}
                  value={form.wired}
                  onChange={(e) => update("wired", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Беспроводных устройств</label>
                <input
                  type="number"
                  min={0}
                  max={MAX_DEVICES}
                  className={fieldCls}
                  value={form.wireless}
                  onChange={(e) => update("wireless", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Принтеры / периферия</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  className={fieldCls}
                  value={form.printers}
                  onChange={(e) => update("printers", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Тип помещения</label>
                <div className="flex gap-2">
                  {(
                    [
                      { id: "office", label: "Офис" },
                      { id: "home", label: "Дом" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => update("spaceType", opt.id)}
                      className={`flex-1 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                        form.spaceType === opt.id
                          ? "bg-ns-accent text-ns-accent-fg"
                          : "ns-chip text-ns-text hover:bg-ns-hover"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={calculateLayout}
                disabled={!hasScene}
                className="aurora-button inline-flex items-center justify-center px-4 py-2 text-sm font-medium transition-transform hover:scale-[1.01] disabled:opacity-40"
              >
                Рассчитать
              </button>
              <button
                type="button"
                onClick={resetLayout}
                disabled={!hasScene}
                className="ns-btn ns-btn-secondary px-4 py-1.5 text-sm disabled:opacity-40"
              >
                Сброс
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-ns-muted">
              <span className="inline-flex items-center gap-1.5">
                <Calculator size={14} strokeWidth={1.6} />
                Площадь: <strong className="text-ns-text">{area} м²</strong>
              </span>
            </div>
          </div>

          <div className="aurora-card rounded-2xl p-3 sm:p-4 space-y-3">
            <canvas
              ref={canvasRef}
              className={`w-full h-[280px] sm:h-[360px] rounded-xl touch-none ${hasScene ? "cursor-grab active:cursor-grabbing" : ""}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-ns-muted px-1">
              <span className="flex items-center gap-1.5">
                <span className="relative flex items-center justify-center w-8 h-8 -ml-1">
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(0, 102, 204, 0.25) 0%, rgba(0, 102, 204, 0) 100%)",
                    }}
                  />
                  <span className="w-[18px] h-[18px] rounded-full bg-ns-accent text-ns-accent-fg flex items-center justify-center text-[10px] font-bold relative z-10">
                    R
                  </span>
                </span>
                Роутер
              </span>
              <span className="flex items-center gap-1.5">
                <span className="relative flex items-center justify-center w-7 h-7 -ml-1">
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(0, 122, 255, 0.35) 0%, rgba(0, 122, 255, 0) 100%)",
                    }}
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-ns-success relative z-10" />
                </span>
                Точка доступа (LAN)
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="text-lg leading-none select-none"
                  role="img"
                  aria-label="Коммутатор"
                >
                  {SWITCH_EMOJI}
                </span>
                Коммутатор
              </span>
              <span className="flex items-center gap-1.5">💻 Проводной ПК</span>
              <span className="flex items-center gap-1.5">📱 Wi‑Fi</span>
              <span className="flex items-center gap-1.5">🖨️ Периферия</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="aurora-card rounded-2xl p-5">
            <p className="text-sm font-semibold text-ns-text mb-4">
              Рекомендуемый комплект
            </p>
            {showCalculated && recommendation.length === 0 && (
              <p className="text-sm text-ns-muted">
                Ничего не подобрано — проверьте параметры.
              </p>
            )}
            <div className="space-y-3">
              {recommendation.map((item) => (
                <Link
                  key={item.product.id}
                  to={`/catalog/${item.product.slug}`}
                  className="flex gap-3 p-3 rounded-xl ns-chip hover:bg-ns-hover transition-colors min-w-0"
                >
                  <div className="w-12 h-12 rounded-lg ns-thumb flex items-center justify-center shrink-0 overflow-hidden">
                    {item.product.imageUrl ? (
                      <MediaImage
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-xs text-ns-muted">—</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ns-text truncate">
                      {item.product.name}
                    </p>
                    <p className="text-[11px] text-ns-muted mt-0.5">
                      {item.reason}
                    </p>
                    <div className="flex items-center justify-between mt-1.5 text-xs">
                      <span className="text-ns-muted">
                        × {item.quantity}
                      </span>
                      <span className="font-semibold text-ns-text">
                        {formatPrice(Number(item.product.price) * item.quantity)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {recommendation.length > 0 && (
              <div className="pt-4 mt-4 space-y-2">
                {cableConnections.length > 0 && (
                  <p className="text-xs text-ns-muted">
                    Проводных соединений: {cableConnections.length}. Патч-корды подобраны по длинам линий на схеме с запасом.
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ns-text">
                    Итого
                  </span>
                  <span className="text-lg font-semibold text-ns-text">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
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
                  : "Добавить весь комплект"}
          </button>
        </div>
      </div>
    </div>
  );
}
