import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Package, ShoppingCart } from "lucide-react";
import api from "../../lib/api";
import { Price } from "../../components/Price";
import { useAuthStore } from "../../store/authStore";
import { isCustomer } from "../../lib/roles";
import MediaImage from "../../components/MediaImage";
import {
  pickBest,
  scoreAdapter,
  scoreSwitch,
  scoreWifiConstructorAp,
  scoreWifiConstructorRouter,
  getCoverageM2,
  getMaxSpeedMbps,
  getPoePortCount,
  getPortCount,
  getRouterLanPortCount,
  hasPoe,
  isManagedSwitch,
  isSmartSwitch,
  isUnmanagedSwitch,
  valueScore,
  wifiRadiusM,
  type ProductSelectorInput,
} from "../../lib/networkSelector";
import { sortBuilderProducts } from "../../lib/builderProducts";
import { productSpecSummary } from "../../lib/productSpecSummary";
import { inputCls as fieldCls, labelCls } from "../../lib/uiClasses";
import { useToastStore } from "../../store/toastStore";
import { themeCanvasColors } from "../../lib/themeColors";
import { useThemeStore } from "../../store/themeStore";

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
  switchMarkers: { x: number; y: number }[];
  clients: ClientPlacement[];
  apMarkers: ApMarker[];
  apRadiusM: number;
  routerRadiusM: number;
}

const DIRECT_ROUTER_WIRED_MAX = 3;
const SWITCH_DEVICE_THRESHOLD = 15;
const AP_PHONE_CLEARANCE_M = 0.5;

type LegacySceneState = Omit<SceneState, "switchMarkers"> & {
  switch?: { x: number; y: number } | null;
};

interface LanPortBudget {
  lanDevices: number;
  baseLanPorts: number;
  portsNeeded: number;
  minPortsRequired: number;
}

function normalizeScene(
  scene: SceneState | LegacySceneState | null,
): SceneState | null {
  if (!scene) return null;
  if ("switchMarkers" in scene && Array.isArray(scene.switchMarkers)) {
    return scene;
  }
  const legacy = scene as LegacySceneState;
  const { switch: legacySwitch, ...rest } = legacy;
  return {
    ...rest,
    switchMarkers: legacySwitch ? [legacySwitch] : [],
  };
}

function computeLanPortBudget(
  scene: SceneState,
  numbers: { wired: number; printers: number },
  spaceType: "office" | "home",
): LanPortBudget {
  const apsCount = scene.apMarkers.length;
  const lanDevices = numbers.wired + numbers.printers + apsCount;
  const baseLanPorts = lanDevices > 0 ? lanDevices + 1 : 0;
  const portHeadroom =
    spaceType === "office"
      ? Math.max(1, Math.ceil(baseLanPorts * 0.25))
      : Math.max(1, Math.ceil(baseLanPorts * 0.2));
  return {
    lanDevices,
    baseLanPorts,
    portsNeeded: baseLanPorts + portHeadroom,
    minPortsRequired: baseLanPorts,
  };
}

function countTotalDevices(numbers: {
  wired: number;
  printers: number;
  wireless: number;
}): number {
  return numbers.wired + numbers.printers + numbers.wireless;
}

function countWiredLanEndpoints(
  numbers: { wired: number; printers: number },
  scene: SceneState,
): number {
  return numbers.wired + numbers.printers + scene.apMarkers.length;
}

function prefersDedicatedSwitch(
  numbers: { wired: number; printers: number },
  scene: SceneState,
): boolean {
  return countWiredLanEndpoints(numbers, scene) > DIRECT_ROUTER_WIRED_MAX;
}

function targetSwitchQuantity(numbers: {
  wired: number;
  printers: number;
  wireless: number;
}): number {
  return countTotalDevices(numbers) <= SWITCH_DEVICE_THRESHOLD
    ? 1
    : MAX_SWITCH_UNITS;
}

function fallbackSwitchPlan(
  switches: Product[],
  budget: LanPortBudget,
  scene: SceneState,
  spaceType: "office" | "home",
  numbers: { wired: number; printers: number; wireless: number },
): SwitchPlan | null {
  if (switches.length === 0) return null;

  const poeNeeded = scene.apMarkers.length;
  const pool = switchPoolForSpace(switches, spaceType, poeNeeded);
  const endpointCount = collectLanEndpoints(scene).length;

  const sw = pickKitProduct(pool, (candidate) =>
    scoreSwitchCandidate(candidate, budget, scene, spaceType),
    spaceType,
  );
  if (!sw) return null;

  const targetQty = targetSwitchQuantity(numbers);
  let quantity = targetQty;
  if (targetQty === 1 && !singleSwitchFits(sw, endpointCount, poeNeeded)) {
    quantity = dualSwitchFits(sw, endpointCount, poeNeeded)
      ? MAX_SWITCH_UNITS
      : 1;
  } else if (
    targetQty === MAX_SWITCH_UNITS &&
    !dualSwitchFits(sw, endpointCount, poeNeeded)
  ) {
    quantity = singleSwitchFits(sw, endpointCount, poeNeeded) ? 1 : MAX_SWITCH_UNITS;
  }
  return { product: sw, quantity };
}

interface LanEndpoint {
  x: number;
  y: number;
  needsPoe: boolean;
}

interface SwitchPlan {
  product: Product;
  quantity: number;
}

function collectLanEndpoints(scene: SceneState): LanEndpoint[] {
  const endpoints: LanEndpoint[] = [];
  scene.clients.forEach((client) => {
    if (client.type === "📱") return;
    endpoints.push({ x: client.x, y: client.y, needsPoe: false });
  });
  scene.apMarkers.forEach((ap) => {
    endpoints.push({ x: ap.x, y: ap.y, needsPoe: true });
  });
  return endpoints;
}

function devicePortsPerSwitch(
  switchIndex: number,
  switchQty: number,
  totalPorts: number,
): number {
  if (switchQty <= 1) return Math.max(0, totalPorts - 1);
  if (switchIndex === 0) return Math.max(0, totalPorts - switchQty);
  return Math.max(0, totalPorts - 1);
}

function totalUsableDevicePorts(switchProduct: Product, qty: number): number {
  const totalPorts = getPortCount(switchProduct);
  let sum = 0;
  for (let i = 0; i < qty; i++) {
    sum += devicePortsPerSwitch(i, qty, totalPorts);
  }
  return sum;
}

function singleSwitchFits(
  switchProduct: Product,
  endpointCount: number,
  poeNeeded: number,
): boolean {
  return (
    totalUsableDevicePorts(switchProduct, 1) >= endpointCount &&
    poeNeeded <= getPoePortCount(switchProduct)
  );
}

function dualSwitchFits(
  switchProduct: Product,
  endpointCount: number,
  poeNeeded: number,
): boolean {
  return (
    totalUsableDevicePorts(switchProduct, 2) >= endpointCount &&
    poeNeeded <= getPoePortCount(switchProduct) * 2
  );
}

function switchPoolForSpace(
  switches: Product[],
  spaceType: "office" | "home",
  poeNeeded: number,
): Product[] {
  let pool = switches;
  if (poeNeeded > 0) {
    const poePool = pool.filter((sw) => getPoePortCount(sw) > 0);
    if (poePool.length > 0) pool = poePool;
  }
  if (spaceType === "home") {
    const homePool = pool.filter(
      (sw) => !isManagedSwitch(sw) && !isSmartSwitch(sw),
    );
    if (homePool.length > 0) pool = homePool;
    else {
      const unmanagedPool = pool.filter((sw) => isUnmanagedSwitch(sw));
      if (unmanagedPool.length > 0) pool = unmanagedPool;
    }
  } else {
    const enterprisePool = pool.filter(
      (sw) => isManagedSwitch(sw) || isSmartSwitch(sw),
    );
    if (enterprisePool.length > 0) pool = enterprisePool;
  }
  return pool;
}

function assignLanEndpointsToSwitches(
  endpoints: LanEndpoint[],
  switchMarkers: { x: number; y: number }[],
  switchProduct: Product,
): number[] {
  const qty = switchMarkers.length;
  if (qty === 0) return endpoints.map(() => -1);

  const totalPorts = getPortCount(switchProduct);
  const poePorts = getPoePortCount(switchProduct);
  const portsAvail = Array.from({ length: qty }, (_, i) =>
    devicePortsPerSwitch(i, qty, totalPorts),
  );
  const usedPorts = portsAvail.map(() => 0);
  const usedPoe = portsAvail.map(() => 0);
  const assignments = new Array<number>(endpoints.length).fill(-1);

  const order = endpoints
    .map((_, index) => index)
    .sort((a, b) => {
      if (endpoints[a].needsPoe !== endpoints[b].needsPoe) {
        return endpoints[a].needsPoe ? -1 : 1;
      }
      const minA = Math.min(
        ...switchMarkers.map((sw) =>
          Math.hypot(endpoints[a].x - sw.x, endpoints[a].y - sw.y),
        ),
      );
      const minB = Math.min(
        ...switchMarkers.map((sw) =>
          Math.hypot(endpoints[b].x - sw.x, endpoints[b].y - sw.y),
        ),
      );
      return minB - minA;
    });

  for (const index of order) {
    const endpoint = endpoints[index];
    let bestSwitch = -1;
    let bestDist = Infinity;

    for (let si = 0; si < qty; si++) {
      if (usedPorts[si] >= portsAvail[si]) continue;
      if (endpoint.needsPoe && usedPoe[si] >= poePorts) continue;
      const dist = Math.hypot(
        endpoint.x - switchMarkers[si].x,
        endpoint.y - switchMarkers[si].y,
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestSwitch = si;
      }
    }

    if (bestSwitch < 0) {
      for (let si = 0; si < qty; si++) {
        if (usedPorts[si] >= portsAvail[si]) continue;
        const dist = Math.hypot(
          endpoint.x - switchMarkers[si].x,
          endpoint.y - switchMarkers[si].y,
        );
        if (dist < bestDist) {
          bestDist = dist;
          bestSwitch = si;
        }
      }
    }

    if (bestSwitch < 0) bestSwitch = 0;
    assignments[index] = bestSwitch;
    usedPorts[bestSwitch]++;
    if (endpoint.needsPoe) usedPoe[bestSwitch]++;
  }

  return assignments;
}

function canAssignAllEndpoints(
  endpoints: LanEndpoint[],
  switchQty: number,
  switchProduct: Product,
  switchMarkers: { x: number; y: number }[],
): boolean {
  if (switchQty !== switchMarkers.length) return false;
  const assignments = assignLanEndpointsToSwitches(
    endpoints,
    switchMarkers,
    switchProduct,
  );
  const totalPorts = getPortCount(switchProduct);
  const poePorts = getPoePortCount(switchProduct);
  const portsAvail = Array.from({ length: switchQty }, (_, i) =>
    devicePortsPerSwitch(i, switchQty, totalPorts),
  );
  const usedPorts = portsAvail.map(() => 0);
  const usedPoe = portsAvail.map(() => 0);

  for (let i = 0; i < endpoints.length; i++) {
    const si = assignments[i];
    if (si < 0) return false;
    usedPorts[si]++;
    if (endpoints[i].needsPoe) usedPoe[si]++;
  }

  for (let si = 0; si < switchQty; si++) {
    if (usedPorts[si] > portsAvail[si]) return false;
    if (usedPoe[si] > poePorts) return false;
  }
  return true;
}

function scoreSwitchCandidate(
  switchCandidate: Product,
  budget: LanPortBudget,
  scene: SceneState,
  spaceType: "office" | "home",
): number {
  const ports = getPortCount(switchCandidate);
  let s =
    scoreSwitch(switchCandidate, {
      portsNeeded: budget.portsNeeded,
      preferManaged: spaceType === "office",
      office: spaceType === "office",
      poePortsNeeded: scene.apMarkers.length,
    }) + scoreSwitchLayoutFit(switchCandidate, scene);
  if (ports < budget.minPortsRequired) {
    s -= (budget.minPortsRequired - ports) * 14;
  } else if (ports < budget.portsNeeded) {
    s -= (budget.portsNeeded - ports) * 4;
  }
  return s;
}

function wiredClientPositions(scene: SceneState): { x: number; y: number }[] {
  return scene.clients.filter((c) => c.type !== "📱").map((c) => ({ x: c.x, y: c.y }));
}

function scoreSwitchTopology(
  switchProduct: Product,
  quantity: number,
  budget: LanPortBudget,
  scene: SceneState,
  endpoints: LanEndpoint[],
  spaceType: "office" | "home",
  numbers: {
    width: number;
    length: number;
    wired: number;
    printers: number;
    wireless: number;
  },
  router: Product | null,
  avoidIcons: { x: number; y: number }[] = [],
): number {
  const markers = computeSwitchMarkers(
    quantity,
    numbers,
    scene.router,
    endpoints,
    switchProduct,
    avoidIcons,
  );
  if (!canAssignAllEndpoints(endpoints, quantity, switchProduct, markers)) {
    return -Infinity;
  }

  let tech = scoreSwitchCandidate(switchProduct, budget, scene, spaceType);
  const totalPorts = getPortCount(switchProduct) * quantity;
  const oversize = totalPorts - budget.portsNeeded;
  if (oversize > 4) tech -= (oversize - 4) * 2.2;
  if (quantity > 1) tech -= (quantity - 1) * 28;

  if (router) {
    const routerSpeed = getMaxSpeedMbps(router);
    const switchSpeed = getMaxSpeedMbps(switchProduct);
    if (switchSpeed < routerSpeed) tech -= 12;
    else if (switchSpeed === routerSpeed) tech += 8;
    else if (switchSpeed <= routerSpeed * 2) tech += 5;
    else tech -= 4;
    if (scene.apMarkers.length > 0) {
      const poeNeeded = scene.apMarkers.length;
      const poeAvail = getPoePortCount(switchProduct);
      if (poeAvail >= poeNeeded) tech += 10;
      else tech -= 22;
    }
  }

  if (quantity > targetSwitchQuantity(numbers)) tech -= 40;

  return valueScore(tech, Number(switchProduct.price) * quantity);
}

function planSwitchTopology(
  switches: Product[],
  router: Product | null,
  scene: SceneState,
  budget: LanPortBudget,
  spaceType: "office" | "home",
  numbers: {
    width: number;
    length: number;
    wired: number;
    printers: number;
    wireless: number;
  },
): SwitchPlan | null {
  if (!prefersDedicatedSwitch(numbers, scene)) {
    return null;
  }
  if (switches.length === 0 || budget.lanDevices < 1) return null;

  const endpoints = collectLanEndpoints(scene);
  const poeNeeded = scene.apMarkers.length;
  const pool = switchPoolForSpace(switches, spaceType, poeNeeded);
  const avoidIcons = wiredClientPositions(scene);
  const targetQty = targetSwitchQuantity(numbers);

  const considerPlan = (
    current: { product: Product; quantity: number; score: number } | null,
    sw: Product,
    qty: number,
    planScore: number,
  ) => {
    if (!Number.isFinite(planScore)) return current;
    const totalPrice = Number(sw.price) * qty;
    if (!current || planScore > current.score + 1e-6) {
      return { product: sw, quantity: qty, score: planScore };
    }
    if (Math.abs(planScore - current.score) > 0.015) return current;
    if (qty < current.quantity) {
      return { product: sw, quantity: qty, score: planScore };
    }
    if (qty === current.quantity && totalPrice < Number(current.product.price) * current.quantity) {
      return { product: sw, quantity: qty, score: planScore };
    }
    return current;
  };

  let best: { product: Product; quantity: number; score: number } | null = null;

  if (targetQty === 1) {
    for (const sw of pool) {
      if (!singleSwitchFits(sw, endpoints.length, poeNeeded)) continue;
      const planScore = scoreSwitchTopology(
        sw,
        1,
        budget,
        scene,
        endpoints,
        spaceType,
        numbers,
        router,
        avoidIcons,
      );
      best = considerPlan(best, sw, 1, planScore);
    }
  } else {
    for (const sw of pool) {
      if (!dualSwitchFits(sw, endpoints.length, poeNeeded)) continue;
      const planScore = scoreSwitchTopology(
        sw,
        MAX_SWITCH_UNITS,
        budget,
        scene,
        endpoints,
        spaceType,
        numbers,
        router,
        avoidIcons,
      );
      best = considerPlan(best, sw, MAX_SWITCH_UNITS, planScore);
    }
  }

  if (best) return { product: best.product, quantity: best.quantity };
  return fallbackSwitchPlan(switches, budget, scene, spaceType, numbers);
}

function kMeansSwitchCentroids(
  endpoints: LanEndpoint[],
  count: number,
  router: { x: number; y: number },
  numbers: { width: number; length: number },
  avoidIcons: { x: number; y: number }[] = [],
): { x: number; y: number }[] {
  if (count <= 0) return [];
  if (endpoints.length === 0) {
    if (count === 1) {
      return [
        clampToRoom(
          numbers.width * 0.72,
          numbers.length * 0.12,
          numbers.width,
          numbers.length,
        ),
      ];
    }
    const markers: { x: number; y: number }[] = [];
    const y = numbers.length * 0.14;
    const marginX = numbers.width * 0.14;
    const span = Math.max(numbers.width * 0.2, numbers.width - marginX * 2);
    for (let i = 0; i < count; i++) {
      const x = marginX + (span * (i + 0.5)) / count;
      markers.push(clampToRoom(x, y, numbers.width, numbers.length));
    }
    return markers;
  }

  if (count === 1) {
    const cx = endpoints.reduce((sum, ep) => sum + ep.x, 0) / endpoints.length;
    const cy = endpoints.reduce((sum, ep) => sum + ep.y, 0) / endpoints.length;
    return [
      clampToRoom(
        cx * 0.7 + router.x * 0.3,
        cy * 0.44 + router.y * 0.2,
        numbers.width,
        numbers.length,
      ),
    ];
  }

  const sorted = [...endpoints].sort((a, b) => a.x - b.x || a.y - b.y);
  const chunk = Math.ceil(sorted.length / count);
  let centroids: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const group = sorted.slice(i * chunk, (i + 1) * chunk);
    if (group.length > 0) {
      centroids.push({
        x: group.reduce((sum, ep) => sum + ep.x, 0) / group.length,
        y: group.reduce((sum, ep) => sum + ep.y, 0) / group.length,
      });
    } else {
      centroids.push({
        x: numbers.width * (0.2 + (0.6 * i) / count),
        y: numbers.length * 0.16,
      });
    }
  }

  for (let iter = 0; iter < 6; iter++) {
    const buckets: LanEndpoint[][] = Array.from({ length: count }, () => []);
    for (const ep of endpoints) {
      let best = 0;
      let bestDist = Infinity;
      for (let ci = 0; ci < count; ci++) {
        const dist = Math.hypot(ep.x - centroids[ci].x, ep.y - centroids[ci].y);
        if (dist < bestDist) {
          bestDist = dist;
          best = ci;
        }
      }
      buckets[best].push(ep);
    }
    centroids = centroids.map((centroid, ci) => {
      const bucket = buckets[ci];
      if (bucket.length === 0) return centroid;
      const cx = bucket.reduce((sum, ep) => sum + ep.x, 0) / bucket.length;
      const cy = bucket.reduce((sum, ep) => sum + ep.y, 0) / bucket.length;
      const pull = ci === 0 ? 0.24 : 0.1;
      const anchor = ci === 0 ? router : centroids[0];
      return clampToRoom(
        cx * (1 - pull) + anchor.x * pull,
        cy * 0.84 + router.y * 0.1,
        numbers.width,
        numbers.length,
      );
    });
  }

  return centroids.map((centroid, ci) => {
    let point = clampToRoom(
      ci === 0 ? centroid.x * 0.9 + router.x * 0.1 : centroid.x,
      centroid.y,
      numbers.width,
      numbers.length,
    );
    if (ci > 0 && avoidIcons.length > 0) {
      point = findClearSwitchPosition(
        point,
        avoidIcons,
        numbers,
        SWITCH_ICON_CLEARANCE_M,
      );
    }
    return point;
  });
}

function refineSwitchMarkers(
  markers: { x: number; y: number }[],
  endpoints: LanEndpoint[],
  switchProduct: Product,
  router: { x: number; y: number },
  numbers: { width: number; length: number },
  avoidIcons: { x: number; y: number }[],
): { x: number; y: number }[] {
  let refined = markers;
  for (let pass = 0; pass < 3; pass++) {
    const assignments = assignLanEndpointsToSwitches(endpoints, refined, switchProduct);
    refined = refined.map((marker, si) => {
      const assigned = endpoints.filter((_, index) => assignments[index] === si);
      if (assigned.length === 0) return marker;
      const cx = assigned.reduce((sum, ep) => sum + ep.x, 0) / assigned.length;
      const cy = assigned.reduce((sum, ep) => sum + ep.y, 0) / assigned.length;
      const pull = si === 0 ? 0.22 : 0.05;
      const anchor = si === 0 ? router : refined[0];
      let next = clampToRoom(
        cx * (1 - pull) + anchor.x * pull,
        cy * 0.86 + router.y * 0.08,
        numbers.width,
        numbers.length,
      );
      if (si > 0) {
        next = findClearSwitchPosition(
          next,
          avoidIcons,
          numbers,
          SWITCH_ICON_CLEARANCE_M,
        );
        next = nudgeAwayFromPoints(
          next.x,
          next.y,
          [refined[0], router],
          1.1,
          numbers,
        );
      }
      return next;
    });
  }
  return refined;
}

function computeSwitchMarkers(
  count: number,
  numbers: { width: number; length: number },
  router: { x: number; y: number },
  endpoints: LanEndpoint[],
  switchProduct: Product | null = null,
  avoidIcons: { x: number; y: number }[] = [],
): { x: number; y: number }[] {
  if (count <= 0) return [];
  const capped = Math.min(MAX_SWITCH_UNITS, count);

  let markers = kMeansSwitchCentroids(endpoints, capped, router, numbers, avoidIcons);
  if (switchProduct && endpoints.length > 0) {
    markers = refineSwitchMarkers(
      markers,
      endpoints,
      switchProduct,
      router,
      numbers,
      avoidIcons,
    );
  } else if (capped > 1 && avoidIcons.length > 0) {
    markers = markers.map((marker, index) =>
      index === 0
        ? marker
        : findClearSwitchPosition(
            marker,
            avoidIcons,
            numbers,
            SWITCH_ICON_CLEARANCE_M,
          ),
    );
  }
  return markers;
}

interface SavedBuilderState {
  form: FormState;
  layoutKey: string;
  scene: SceneState | null;
  showCalculated: boolean;
}

interface LegacySavedModeState {
  sceneKey: string;
  scene: SceneState;
  showCalculated: boolean;
}

interface LegacySavedBuilderState {
  form: FormState;
  modes: Partial<Record<FormState["spaceType"], LegacySavedModeState>>;
}

const DEFAULT_FORM: FormState = {
  width: "10",
  length: "8",
  wired: "5",
  wireless: "8",
  printers: "1",
  spaceType: "office",
};

const STORAGE_KEY = "network-builder-state-v3";
const LEGACY_STORAGE_KEY = "network-builder-state-v2";

function layoutKeyFromNumbers(numbers: {
  width: number;
  length: number;
  wired: number;
  wireless: number;
  printers: number;
}): string {
  return `${numbers.width}x${numbers.length}x${numbers.wired}x${numbers.wireless}x${numbers.printers}`;
}

function layoutKeyFromLegacySceneKey(sceneKey: string): string {
  return sceneKey.replace(/x(?:office|home)$/, "");
}

function migrateLegacySavedBuilder(
  legacy: LegacySavedBuilderState,
): SavedBuilderState | null {
  const office = legacy.modes?.office;
  const home = legacy.modes?.home;
  const picked = office?.scene ? office : home;
  if (!picked?.scene) {
    return {
      form: legacy.form ?? DEFAULT_FORM,
      layoutKey: "",
      scene: null,
      showCalculated: false,
    };
  }

  return {
    form: legacy.form ?? DEFAULT_FORM,
    layoutKey: layoutKeyFromLegacySceneKey(picked.sceneKey),
    scene: normalizeScene(picked.scene),
    showCalculated: Boolean(office?.showCalculated || home?.showCalculated),
  };
}

function readSavedBuilder(): SavedBuilderState | null {
  try {
    const rawV3 = window.localStorage.getItem(STORAGE_KEY);
    if (rawV3) {
      return JSON.parse(rawV3) as SavedBuilderState;
    }

    const rawV2 = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!rawV2) return null;

    const migrated = migrateLegacySavedBuilder(
      JSON.parse(rawV2) as LegacySavedBuilderState,
    );
    if (migrated) {
      writeSavedBuilder(migrated);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    return migrated;
  } catch {
    return null;
  }
}

function writeSavedBuilder(value: SavedBuilderState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {}
}

function radiusFromCoverageM(
  product: ProductSelectorInput,
  roomWidth: number,
  roomLength: number,
): number {
  return wifiRadiusM(product, roomWidth, roomLength);
}

function scoreRouterLayoutFit(
  product: ProductSelectorInput,
  scene: SceneState,
  roomWidth: number,
  roomLength: number,
): number {
  const r = radiusFromCoverageM(product, roomWidth, roomLength);
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
  roomWidth: number,
  roomLength: number,
): number {
  const rAp = radiusFromCoverageM(product, roomWidth, roomLength);
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

function scoreSwitchLayoutFitAt(
  product: ProductSelectorInput,
  sw: { x: number; y: number },
  scene: SceneState,
): number {
  let maxD = 0;
  for (const ap of scene.apMarkers) {
    maxD = Math.max(maxD, Math.hypot(ap.x - sw.x, ap.y - sw.y));
  }
  for (const c of scene.clients) {
    if (c.type === "📱") continue;
    maxD = Math.max(maxD, Math.hypot(c.x - sw.x, c.y - sw.y));
  }
  if (maxD < 14) return 0;
  if (!hasPoe(product)) return 0;
  return Math.min(12, (maxD - 14) * 0.15);
}

function scoreSwitchLayoutFit(
  product: ProductSelectorInput,
  scene: SceneState,
): number {
  if (scene.switchMarkers.length === 0) return 0;
  const total = scene.switchMarkers.reduce(
    (sum, sw) => sum + scoreSwitchLayoutFitAt(product, sw, scene),
    0,
  );
  return total / scene.switchMarkers.length;
}

const MAX_DEVICES = 200;
const ROOM_MARGIN_M = 0.42;
const MAX_SWITCH_UNITS = 2;
const SWITCH_ICON_CLEARANCE_M = 1.35;

const SWITCH_EMOJI = "\u{1F5A7}";

const SCHEME_LEGEND: { mark: string; label: string }[] = [
  { mark: "R", label: "Маршрутизатор" },
  { mark: "AP", label: "Точка доступа" },
  { mark: SWITCH_EMOJI, label: "Коммутатор" },
  { mark: "💻", label: "Проводные ПК" },
  { mark: "📱", label: "Беспроводные устройства" },
  { mark: "🖨️", label: "Принтеры и периферия" },
];

function fetchCategoryProducts(slug: string) {
  return api
    .get("/products", { params: { category: slug, limit: 100, sort: "name-asc" } })
    .then((r) => sortBuilderProducts(r.data.products as Product[]));
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

function nudgeAwayFromPoints(
  x: number,
  y: number,
  avoid: { x: number; y: number }[],
  minDist: number,
  numbers: { width: number; length: number },
): { x: number; y: number } {
  if (avoid.length === 0) {
    return clampToRoom(x, y, numbers.width, numbers.length);
  }
  let nx = x;
  let ny = y;
  for (let step = 0; step < 28; step++) {
    const nearest = avoid.reduce(
      (best, point) => {
        const dist = Math.hypot(point.x - nx, point.y - ny);
        return dist < best.dist ? { point, dist } : best;
      },
      { point: avoid[0], dist: Infinity },
    );
    if (!nearest.point || nearest.dist >= minDist) {
      return clampToRoom(nx, ny, numbers.width, numbers.length);
    }
    const dx = nx - nearest.point.x;
    const dy = ny - nearest.point.y;
    const len = Math.hypot(dx, dy) || 1;
    nx += (dx / len) * 0.8;
    ny += (dy / len) * 0.8;
    const clamped = clampToRoom(nx, ny, numbers.width, numbers.length);
    nx = clamped.x;
    ny = clamped.y;
  }
  return clampToRoom(nx, ny, numbers.width, numbers.length);
}

function findClearSwitchPosition(
  preferred: { x: number; y: number },
  avoid: { x: number; y: number }[],
  numbers: { width: number; length: number },
  minClearance: number,
): { x: number; y: number } {
  if (avoid.length === 0) return preferred;

  const marginX = numbers.width * 0.1;
  const marginY = numbers.length * 0.1;
  const candidates: { x: number; y: number }[] = [
    preferred,
    { x: marginX, y: marginY },
    { x: numbers.width - marginX, y: marginY },
    { x: marginX, y: numbers.length - marginY },
    { x: numbers.width - marginX, y: numbers.length - marginY },
    { x: numbers.width / 2, y: marginY },
    { x: numbers.width / 2, y: numbers.length - marginY },
    { x: marginX, y: numbers.length / 2 },
    { x: numbers.width - marginX, y: numbers.length / 2 },
  ];

  let best = preferred;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const q = clampToRoom(candidate.x, candidate.y, numbers.width, numbers.length);
    const minD = Math.min(
      ...avoid.map((point) => Math.hypot(point.x - q.x, point.y - q.y)),
    );
    if (minD < minClearance) continue;
    const score = minD * 2 - Math.hypot(q.x - preferred.x, q.y - preferred.y) * 0.25;
    if (score > bestScore) {
      bestScore = score;
      best = q;
    }
  }
  if (bestScore > -Infinity) return best;
  return nudgeAwayFromPoints(
    preferred.x,
    preferred.y,
    avoid,
    minClearance,
    numbers,
  );
}

function refineApAwayFromPhones(
  pos: { x: number; y: number },
  clusterPhones: { x: number; y: number }[],
  numbers: { width: number; length: number },
): { x: number; y: number } {
  let { x, y } = pos;
  for (let step = 0; step < 10; step++) {
    let fx = 0;
    let fy = 0;
    for (const phone of clusterPhones) {
      const dx = x - phone.x;
      const dy = y - phone.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= AP_PHONE_CLEARANCE_M) continue;
      const push = (AP_PHONE_CLEARANCE_M - dist) / Math.max(dist, 0.08);
      fx += dx * push;
      fy += dy * push;
    }
    if (fx === 0 && fy === 0) break;
    x += fx * 0.85;
    y += fy * 0.85;
    ({ x, y } = clampToRoom(x, y, numbers.width, numbers.length));
  }
  return { x, y };
}

function scoreApCandidatePosition(
  pos: { x: number; y: number },
  cluster: ClientPlacement[],
  router: { x: number; y: number },
  apRadiusM: number,
  existingAps: ApMarker[],
): number {
  let covered = 0;
  let avgClusterDist = 0;
  let minClusterDist = Infinity;
  for (const client of cluster) {
    const dist = Math.hypot(client.x - pos.x, client.y - pos.y);
    avgClusterDist += dist;
    minClusterDist = Math.min(minClusterDist, dist);
    if (dist <= apRadiusM) covered += 1;
  }
  if (covered === 0) return -Infinity;
  avgClusterDist /= cluster.length;

  if (minClusterDist < AP_PHONE_CLEARANCE_M * 0.65) return -Infinity;

  let overlapPenalty = 0;
  for (const ap of existingAps) {
    const dist = Math.hypot(ap.x - pos.x, ap.y - pos.y);
    if (dist < apRadiusM * 0.45) overlapPenalty += 30;
  }

  const routerDist = Math.hypot(pos.x - router.x, pos.y - router.y);
  const proximityBonus = Math.max(0, 3.2 - avgClusterDist) * 14;
  const nearBonus = Math.max(0, 1.4 - minClusterDist) * 8;
  return (
    covered * 12 +
    proximityBonus +
    nearBonus -
    overlapPenalty -
    routerDist * 0.06
  );
}

function findOptimalApPosition(
  cluster: ClientPlacement[],
  router: { x: number; y: number },
  apRadiusM: number,
  numbers: { width: number; length: number },
  existingAps: ApMarker[],
): { x: number; y: number } {
  if (cluster.length === 0) {
    return clampToRoom(
      numbers.width / 2,
      numbers.length / 2,
      numbers.width,
      numbers.length,
    );
  }

  const cx =
    cluster.reduce((sum, client) => sum + client.x, 0) / cluster.length;
  const cy =
    cluster.reduce((sum, client) => sum + client.y, 0) / cluster.length;

  const clusterPhones = cluster.map((client) => ({
    x: client.x,
    y: client.y,
  }));

  const candidates: { x: number; y: number }[] = [{ x: cx, y: cy }];
  for (const client of cluster) {
    candidates.push({ x: client.x, y: client.y });
  }
  for (let ring = 0.25; ring <= Math.min(apRadiusM * 0.35, 2.5); ring += 0.25) {
    for (let angle = 0; angle < 12; angle += 1) {
      const rad = (angle * Math.PI) / 6;
      candidates.push({
        x: cx + ring * Math.cos(rad),
        y: cy + ring * Math.sin(rad),
      });
    }
  }
  for (const client of cluster) {
    for (let ring = 0.35; ring <= 1.2; ring += 0.35) {
      for (let angle = 0; angle < 8; angle += 1) {
        const rad = (angle * Math.PI) / 4;
        candidates.push({
          x: client.x + ring * Math.cos(rad),
          y: client.y + ring * Math.sin(rad),
        });
      }
    }
  }

  let best = clampToRoom(cx, cy, numbers.width, numbers.length);
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const refined = refineApAwayFromPhones(
      clampToRoom(candidate.x, candidate.y, numbers.width, numbers.length),
      clusterPhones,
      numbers,
    );
    const score = scoreApCandidatePosition(
      refined,
      cluster,
      router,
      apRadiusM,
      existingAps,
    );
    if (score > bestScore) {
      bestScore = score;
      best = refined;
    }
  }
  return best;
}

function estimateMaxApCount(
  wirelessOutsideRouter: number,
  apRadiusM: number,
  numbers: { width: number; length: number },
): number {
  if (wirelessOutsideRouter <= 0) return 0;
  const roomArea = Math.max(1, numbers.width * numbers.length);
  const apCoverageArea = Math.max(1, Math.PI * apRadiusM * apRadiusM);
  const byArea = Math.ceil(roomArea / (apCoverageArea * 0.85));
  const clientsPerAp = Math.max(6, Math.round(apCoverageArea / 20));
  const byClients = Math.ceil(wirelessOutsideRouter / clientsPerAp);
  return Math.min(6, Math.max(1, Math.min(byArea, byClients)));
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
    (client) =>
      client.type === "📱" &&
      Math.hypot(client.x - router.x, client.y - router.y) > routerRadiusM,
  );

  const maxApCount = estimateMaxApCount(uncovered.length, apRadiusM, numbers);
  if (maxApCount === 0) return [];

  while (uncovered.length > 0 && apMarkers.length < maxApCount) {
    let bestCenter = uncovered[0];
    let maxCovered = 0;
    for (const candidate of uncovered) {
      const coveredCount = uncovered.filter(
        (phone) =>
          Math.hypot(phone.x - candidate.x, phone.y - candidate.y) <= apRadiusM,
      ).length;
      if (coveredCount > maxCovered) {
        maxCovered = coveredCount;
        bestCenter = candidate;
      }
    }
    const cluster = uncovered.filter(
      (phone) =>
        Math.hypot(phone.x - bestCenter.x, phone.y - bestCenter.y) <= apRadiusM,
    );
    const position = findOptimalApPosition(
      cluster,
      router,
      apRadiusM,
      numbers,
      apMarkers,
    );
    apMarkers.push(position);
    uncovered = uncovered.filter(
      (phone) =>
        Math.hypot(phone.x - position.x, phone.y - position.y) > apRadiusM,
    );
  }

  return apMarkers;
}

function estimateClientsPerAp(wireless: number, areaM2: number): number {
  return Math.max(
    2,
    Math.ceil(wireless / Math.max(1, Math.ceil(areaM2 / 80))),
  );
}

function getPatchCordLengthM(product: Product): number | null {
  const specs = product.specs ?? {};
  const text = [product.name, ...Object.entries(specs).flat()].join(" ").toLowerCase();
  const direct = text.match(/(?:длина кабеля|длина)\D{0,18}(\d+(?:[,.]\d+)?)\s*м/);
  const generic = text.match(/(\d+(?:[,.]\d+)?)\s*м\b/);
  const value = Number((direct?.[1] ?? generic?.[1] ?? "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function computeCableConnections(
  scene: SceneState,
  switchPlan?: SwitchPlan | null,
): CableConnection[] {
  const connections: CableConnection[] = [];
  const lengthWithSlack = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.max(1, Math.ceil((Math.hypot(a.x - b.x, a.y - b.y) * 1.15 + 0.5) * 10) / 10);

  const switchLabel = (index: number, total: number) =>
    total > 1 ? `Коммутатор ${index + 1}` : "Коммутатор";

  if (scene.switchMarkers.length === 0) {
    let pcCount = 0;
    let peripheralCount = 0;
    scene.clients.forEach((client) => {
      if (client.type === "📱") return;
      const label =
        client.type === "🖨️"
          ? `Периферия ${++peripheralCount}`
          : `ПК ${++pcCount}`;
      connections.push({
        from: "Роутер",
        to: label,
        lengthM: lengthWithSlack(scene.router, client),
      });
    });
    scene.apMarkers.forEach((ap, index) => {
      connections.push({
        from: "Роутер",
        to: `Точка доступа ${index + 1}`,
        lengthM: lengthWithSlack(scene.router, ap),
      });
    });
    return connections;
  }

  const switches = scene.switchMarkers;
  connections.push({
    from: "Роутер",
    to: switchLabel(0, switches.length),
    lengthM: lengthWithSlack(scene.router, switches[0]),
  });

  for (let i = 1; i < switches.length; i++) {
    connections.push({
      from: switchLabel(0, switches.length),
      to: switchLabel(i, switches.length),
      lengthM: lengthWithSlack(switches[0], switches[i]),
    });
  }

  const endpoints = collectLanEndpoints(scene);
  const assignments =
    switchPlan && switches.length === switchPlan.quantity
      ? assignLanEndpointsToSwitches(endpoints, switches, switchPlan.product)
      : endpoints.map((endpoint) => {
          let best = 0;
          let bestDist = Infinity;
          switches.forEach((sw, index) => {
            const dist = Math.hypot(endpoint.x - sw.x, endpoint.y - sw.y);
            if (dist < bestDist) {
              bestDist = dist;
              best = index;
            }
          });
          return best;
        });

  let endpointIndex = 0;
  let pcCount = 0;
  let peripheralCount = 0;
  scene.clients.forEach((client) => {
    if (client.type === "📱") return;
    const label =
      client.type === "🖨️"
        ? `Периферия ${++peripheralCount}`
        : `ПК ${++pcCount}`;
    const swIndex = assignments[endpointIndex++] ?? 0;
    connections.push({
      from: switchLabel(swIndex, switches.length),
      to: label,
      lengthM: lengthWithSlack(switches[swIndex], client),
    });
  });

  scene.apMarkers.forEach((ap, index) => {
    const swIndex = assignments[endpointIndex++] ?? 0;
    connections.push({
      from: switchLabel(swIndex, switches.length),
      to: `Точка доступа ${index + 1}`,
      lengthM: lengthWithSlack(switches[swIndex], ap),
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

function scoreKitCompatibility(
  router: Product | null,
  switchProduct: Product | null,
  ap: Product | null,
  apCount: number,
): number {
  if (!router) return 0;
  let score = 0;
  const routerSpeed = getMaxSpeedMbps(router);
  if (switchProduct) {
    const switchSpeed = getMaxSpeedMbps(switchProduct);
    if (switchSpeed < routerSpeed) score -= 18;
    else if (switchSpeed === routerSpeed) score += 10;
    else if (switchSpeed <= routerSpeed * 2) score += 6;
    else score -= 4;
    if (apCount > 0) {
      const poeNeeded = apCount;
      const poeAvail = getPoePortCount(switchProduct);
      if (poeAvail >= poeNeeded) score += 12;
      else score -= 22;
    }
  } else if (apCount > 0) {
    const routerPoe = getPoePortCount(router);
    const routerLan = getRouterLanPortCount(router);
    if (routerPoe >= apCount) score += 10;
    else if (apCount + 1 <= routerLan) score += 4;
    else score -= 10;
  }
  if (ap && switchProduct) {
    const apSpeed = getMaxSpeedMbps(ap);
    const uplinkSpeed = getMaxSpeedMbps(switchProduct);
    if (apSpeed > uplinkSpeed * 2) score -= 6;
    else score += 4;
  }
  return score;
}

function pickKitProduct<T extends Product>(
  pool: T[],
  score: (product: T) => number,
  spaceType: "office" | "home",
): T | null {
  if (pool.length === 0) return null;
  if (spaceType === "office") {
    return pickBest(pool, score, "prefer_performance");
  }
  return pickBalancedKit(pool, score, 2.5);
}

function pickBalancedKit<T extends Product>(
  pool: T[],
  score: (product: T) => number,
  closeGap = 3,
): T | null {
  if (pool.length === 0) return null;
  let best = pool[0];
  let bestScore = score(best);
  for (let i = 1; i < pool.length; i++) {
    const candidate = pool[i];
    const candidateScore = score(candidate);
    if (candidateScore > bestScore + 1e-6) {
      best = candidate;
      bestScore = candidateScore;
      continue;
    }
    if (Math.abs(candidateScore - bestScore) > closeGap) continue;

    const candidateValue = valueScore(candidateScore, Number(candidate.price));
    const bestValue = valueScore(bestScore, Number(best.price));
    if (
      candidateValue > bestValue + 1e-6 ||
      (Math.abs(candidateValue - bestValue) <= 1e-6 &&
        (Number(candidate.price) < Number(best.price) ||
          (Number(candidate.price) === Number(best.price) &&
            candidate.id < best.id)))
    ) {
      best = candidate;
      bestScore = candidateScore;
    }
  }
  return best;
}

function routerCandidatesForArea(routers: Product[], area: number): Product[] {
  const minCoverage = Math.max(30, area * 0.42);
  const filtered = routers.filter((router) => getCoverageM2(router) >= minCoverage);
  return filtered.length > 0 ? filtered : routers;
}

function buildSceneState(
  numbers: {
    width: number;
    length: number;
    wired: number;
    wireless: number;
    printers: number;
  },
): SceneState {
  const clients = buildInitialClientPlacements(numbers);

  const router = clampToRoom(
    numbers.width * 0.28,
    numbers.length * 0.12,
    numbers.width,
    numbers.length,
  );

  return {
    router,
    switchMarkers: [],
    clients,
    apMarkers: [],
    apRadiusM: 5,
    routerRadiusM: 7,
  };
}

type DragKind = "router" | "switch" | "client" | "ap";

interface DragState {
  kind: DragKind;
  index: number;
  grabDx: number;
  grabDy: number;
}

function applySceneDrag(
  scene: SceneState,
  kind: DragKind,
  index: number,
  position: { x: number; y: number },
): SceneState {
  if (kind === "router") {
    return { ...scene, router: position };
  }
  if (kind === "switch" && index >= 0 && index < scene.switchMarkers.length) {
    const switchMarkers = [...scene.switchMarkers];
    switchMarkers[index] = position;
    return { ...scene, switchMarkers };
  }
  if (kind === "client" && index >= 0 && index < scene.clients.length) {
    const clients = [...scene.clients];
    clients[index] = { ...clients[index], x: position.x, y: position.y };
    return { ...scene, clients };
  }
  if (kind === "ap" && index >= 0 && index < scene.apMarkers.length) {
    const apMarkers = [...scene.apMarkers];
    apMarkers[index] = { x: position.x, y: position.y };
    return { ...scene, apMarkers };
  }
  return scene;
}

function recomputeApMarkersOnly(
  base: SceneState,
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
  if (numbers.wireless <= 0 || aps.length === 0) {
    return { ...base, apMarkers: [] };
  }

  const totalWired = numbers.wired + numbers.printers;
  const totalClients = totalWired + numbers.wireless;
  const routerProduct = pickKitProduct(
    routerCandidatesForArea(routers, area),
    (routerCandidate) =>
      scoreWifiConstructorRouter(
        routerCandidate,
        area,
        totalClients,
        spaceType,
      ) +
      scoreRouterLayoutFit(
        routerCandidate,
        base,
        numbers.width,
        numbers.length,
      ),
    spaceType,
  );
  const nextRouterRadiusM = routerProduct
    ? wifiRadiusM(routerProduct, numbers.width, numbers.length)
    : base.routerRadiusM;
  const clientsPerApEst = estimateClientsPerAp(numbers.wireless, area);
  let bestAp = pickKitProduct(
    aps,
    (apCandidate) =>
      scoreWifiConstructorAp(apCandidate, area, clientsPerApEst, spaceType),
    spaceType,
  );
  let nextApRadiusM = bestAp
    ? wifiRadiusM(bestAp, numbers.width, numbers.length)
    : base.apRadiusM;
  let apMarkers = computeApMarkers(
    base.clients,
    base.router,
    nextRouterRadiusM,
    nextApRadiusM,
    numbers,
  );
  if (apMarkers.length > 0) {
    const sceneDraft: SceneState = {
      ...base,
      apMarkers,
      routerRadiusM: nextRouterRadiusM,
      apRadiusM: nextApRadiusM,
    };
    bestAp = pickKitProduct(
      aps,
      (apCandidate) =>
        scoreWifiConstructorAp(apCandidate, area, clientsPerApEst, spaceType) +
        scoreApLayoutFit(
          apCandidate,
          sceneDraft,
          nextRouterRadiusM,
          numbers.width,
          numbers.length,
        ),
      spaceType,
    );
    nextApRadiusM = bestAp
      ? wifiRadiusM(bestAp, numbers.width, numbers.length)
      : nextApRadiusM;
    apMarkers = computeApMarkers(
      base.clients,
      base.router,
      nextRouterRadiusM,
      nextApRadiusM,
      numbers,
    );
  }
  return {
    ...base,
    apMarkers,
    apRadiusM: nextApRadiusM,
    routerRadiusM: nextRouterRadiusM,
  };
}

function refreshSceneRadiiOnly(
  base: SceneState,
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
  const totalWired = numbers.wired + numbers.printers;
  const totalClients = totalWired + numbers.wireless;
  const routerProduct = pickKitProduct(
    routerCandidatesForArea(routers, area),
    (routerCandidate) =>
      scoreWifiConstructorRouter(
        routerCandidate,
        area,
        totalClients,
        spaceType,
      ) +
      scoreRouterLayoutFit(
        routerCandidate,
        base,
        numbers.width,
        numbers.length,
      ),
    spaceType,
  );
  const nextRouterRadiusM = routerProduct
    ? wifiRadiusM(routerProduct, numbers.width, numbers.length)
    : base.routerRadiusM;

  let nextApRadiusM = base.apRadiusM;
  if (numbers.wireless > 0 && aps.length > 0) {
    const clientsPerApEst = estimateClientsPerAp(numbers.wireless, area);
    const bestAp = pickKitProduct(
      aps,
      (apCandidate) =>
        scoreWifiConstructorAp(apCandidate, area, clientsPerApEst, spaceType) +
        (base.apMarkers.length > 0
          ? scoreApLayoutFit(
              apCandidate,
              base,
              nextRouterRadiusM,
              numbers.width,
              numbers.length,
            )
          : 0),
      spaceType,
    );
    if (bestAp) {
      nextApRadiusM = wifiRadiusM(bestAp, numbers.width, numbers.length);
    }
  }

  return {
    ...base,
    routerRadiusM: nextRouterRadiusM,
    apRadiusM: nextApRadiusM,
  };
}

function recomputeNetworkLayout(
  base: SceneState,
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
  switches: Product[],
): SceneState {
  const withAps = recomputeApMarkersOnly(
    base,
    numbers,
    area,
    spaceType,
    routers,
    aps,
  );
  const sceneDraft: SceneState = withAps;
  const totalWired = numbers.wired + numbers.printers;
  const totalClients = totalWired + numbers.wireless;
  const routerProduct = pickKitProduct(
    routerCandidatesForArea(routers, area),
    (routerCandidate) =>
      scoreWifiConstructorRouter(
        routerCandidate,
        area,
        totalClients,
        spaceType,
      ) +
      scoreRouterLayoutFit(
        routerCandidate,
        base,
        numbers.width,
        numbers.length,
      ),
    spaceType,
  );
  const budget = computeLanPortBudget(sceneDraft, numbers, spaceType);
  const switchPlan = planSwitchTopology(
    switches,
    routerProduct,
    sceneDraft,
    budget,
    spaceType,
    numbers,
  );
  const endpoints = collectLanEndpoints(sceneDraft);
  const switchMarkers = switchPlan
    ? base.switchMarkers.length === switchPlan.quantity
      ? base.switchMarkers
      : computeSwitchMarkers(
          switchPlan.quantity,
          numbers,
          sceneDraft.router,
          endpoints,
          switchPlan.product,
          wiredClientPositions(sceneDraft),
        )
    : [];
  return {
    ...sceneDraft,
    switchMarkers,
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
  const padX = 18;
  const padTop = 26;
  const padBottom = 14;
  const roomRatio = numbers.width / numbers.length;
  const availW = cssWidth - padX * 2;
  const availH = cssHeight - padTop - padBottom;
  let roomW = availW;
  let roomH = availW / roomRatio;
  if (roomH > availH) {
    roomH = availH;
    roomW = availH * roomRatio;
  }
  const rx = (cssWidth - roomW) / 2;
  const ry = padTop + (availH - roomH) / 2;
  return { rx, ry, roomW, roomH, ppm: roomW / numbers.width };
}

export default function NetworkBuilderPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const dark = useThemeStore((s) => s.dark);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const showCalculatedRef = useRef(false);
  const initialSavedRef = useRef<SavedBuilderState | null>(readSavedBuilder());

  const [form, setForm] = useState<FormState>(
    () => initialSavedRef.current?.form ?? DEFAULT_FORM,
  );

  const [scene, setScene] = useState<SceneState | null>(() => {
    const saved = initialSavedRef.current;
    return normalizeScene(saved?.scene ?? null);
  });
  const [showCalculated, setShowCalculated] = useState(
    () => initialSavedRef.current?.showCalculated ?? false,
  );
  showCalculatedRef.current = showCalculated;

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

  const layoutKey = useMemo(() => layoutKeyFromNumbers(numbers), [numbers]);

  useEffect(() => {
    const saved = readSavedBuilder();
    let next: SceneState | null;
    let calculated = false;
    if (saved?.layoutKey === layoutKey && saved.scene) {
      next = normalizeScene(saved.scene);
      calculated = saved.showCalculated;
    } else {
      next = buildSceneState(numbers);
      calculated = false;
    }
    if (next && routers.length > 0) {
      next = refreshSceneRadiiOnly(
        next,
        numbers,
        area,
        form.spaceType,
        routers,
        aps,
      );
    }
    setScene(next);
    setShowCalculated(calculated);
  }, [layoutKey, numbers, area, form.spaceType, routers, aps]);

  useEffect(() => {
    if (!scene) return;
    writeSavedBuilder({
      form,
      layoutKey,
      scene,
      showCalculated,
    });
  }, [form, scene, layoutKey, showCalculated]);

  const resetLayout = useCallback(() => {
    writeSavedBuilder({
      form,
      layoutKey: "",
      scene: null,
      showCalculated: false,
    });
    let next = buildSceneState(numbers);
    if (routers.length > 0) {
      next = refreshSceneRadiiOnly(
        next,
        numbers,
        area,
        form.spaceType,
        routers,
        aps,
      );
    }
    setScene(next);
    setShowCalculated(false);
  }, [form, numbers, area, form.spaceType, routers, aps]);

  const calculateLayout = useCallback(() => {
    setScene((prev) =>
      recomputeNetworkLayout(
        prev ?? buildSceneState(numbers),
        numbers,
        area,
        form.spaceType,
        routers,
        aps,
        switches,
      ),
    );
    setShowCalculated(true);
  }, [numbers, area, form.spaceType, routers, aps, switches]);

  const kit = useMemo(() => {
    if (!scene || !showCalculated) {
      return {
        recommendation: [] as RecommendedItem[],
        routerRadiusM: scene?.routerRadiusM ?? 7,
        cableConnections: [] as CableConnection[],
        switchPlan: null as SwitchPlan | null,
      };
    }

    const items: RecommendedItem[] = [];
    const totalWired = numbers.wired + numbers.printers;
    const totalClients = totalWired + numbers.wireless;

    const router = pickKitProduct(
      routerCandidatesForArea(routers, area),
      (routerCandidate) =>
        scoreWifiConstructorRouter(
          routerCandidate,
          area,
          totalClients,
          form.spaceType,
        ) +
        scoreRouterLayoutFit(
          routerCandidate,
          scene,
          numbers.width,
          numbers.length,
        ),
      form.spaceType,
    );

    const routerRadiusM = router
      ? wifiRadiusM(router, numbers.width, numbers.length)
      : 7;

    if (router) {
      items.push({
        product: router,
        quantity: 1,
        reason: productSpecSummary(router),
      });
    }

    const apsCount = scene.apMarkers.length;
    const budget = computeLanPortBudget(scene, numbers, form.spaceType);
    const switchPlan = planSwitchTopology(
      switches,
      router,
      scene,
      budget,
      form.spaceType,
      numbers,
    );
    const cableConnections = computeCableConnections(scene, switchPlan);
    if (switchPlan) {
      const insertAt = router ? 1 : 0;
      items.splice(insertAt, 0, {
        product: switchPlan.product,
        quantity: switchPlan.quantity,
        reason: productSpecSummary(switchPlan.product),
      });
    }

    if (numbers.wireless > 0 && aps.length > 0) {
      const clientsPerApEst = estimateClientsPerAp(numbers.wireless, area);
      const bestAp = pickKitProduct(
        aps,
        (apCandidate) =>
          scoreWifiConstructorAp(apCandidate, area, clientsPerApEst, form.spaceType) +
          scoreApLayoutFit(
            apCandidate,
            scene,
            routerRadiusM,
            numbers.width,
            numbers.length,
          ) +
          scoreKitCompatibility(
            router,
            switchPlan?.product ?? null,
            apCandidate,
            apsCount,
          ),
        form.spaceType,
      );
      if (bestAp && apsCount > 0) {
        items.push({
          product: bestAp,
          quantity: apsCount,
          reason: productSpecSummary(bestAp),
        });
      }
    }

    if (form.spaceType === "office" && numbers.wireless >= 4) {
      const adapter = pickKitProduct(
        adapters,
        (adapterCandidate) => scoreAdapter(adapterCandidate, "office"),
        "office",
      );
      if (adapter) {
        const adapterQty = Math.max(1, Math.floor(numbers.wireless / 4));
        items.push({
          product: adapter,
          quantity: adapterQty,
          reason: productSpecSummary(adapter),
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
          reason: productSpecSummary(item.product),
        });
      }
    }

    return { recommendation: items, routerRadiusM, cableConnections, switchPlan };
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

  const { recommendation, switchPlan: activeSwitchPlan } = kit;

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
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      const skipped = Number(res.data?.skipped ?? 0);
      if (skipped > 0) {
        useToastStore
          .getState()
          .show(
            `Добавлено не всё: ${skipped} поз. нет на складе`,
            "info",
          );
      }
      navigate("/cart");
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      useToastStore
        .getState()
        .show(
          err.response?.data?.message ?? "Не удалось добавить комплект в корзину",
          "error",
        );
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
        return applySceneDrag(prev, kind, index, p);
      });
    },
    [numbers],
  );

  const finalizeWirelessDragLayout = useCallback(
    (kind: DragKind, clientIndex: number) => {
      if (!showCalculatedRef.current) return;
      if (kind !== "router" && kind !== "client") return;
      setScene((prev) => {
        if (!prev) return prev;
        if (
          kind === "client" &&
          (clientIndex < 0 || prev.clients[clientIndex]?.type !== "📱")
        ) {
          return prev;
        }
        return recomputeApMarkersOnly(
          prev,
          numbers,
          area,
          form.spaceType,
          routers,
          aps,
        );
      });
    },
    [numbers, area, form.spaceType, routers, aps],
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

      const colors = themeCanvasColors(dark);
      const wallColor = colors.wall;
      const fillColor = colors.fill;
      const labelColor = colors.label;
      const glow = dark ? "250,250,250" : "9,9,11";

      ctx.fillStyle = fillColor;
      ctx.fillRect(rx, ry, roomW, roomH);

      ctx.save();
      ctx.beginPath();
      ctx.rect(rx, ry, roomW, roomH);
      ctx.clip();

      const drawCoverageZone = (
        px: number,
        py: number,
        radiusM: number,
        innerAlpha: number,
        strokeAlpha: number,
      ) => {
        const rPx = radiusM * pixelsPerMeter;
        if (rPx < 2) return;

        const grad = ctx.createRadialGradient(px, py, 0, px, py, rPx);
        grad.addColorStop(0, `rgba(${glow}, ${innerAlpha})`);
        grad.addColorStop(0.72, `rgba(${glow}, ${innerAlpha * 0.35})`);
        grad.addColorStop(1, `rgba(${glow}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, rPx, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, rPx, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${glow}, ${strokeAlpha})`;
        ctx.lineWidth = 1.25;
        ctx.stroke();
      };

      const cx = rx + scene.router.x * pixelsPerMeter;
      const cy = ry + scene.router.y * pixelsPerMeter;

      drawCoverageZone(cx, cy, scene.routerRadiusM, 0.22, 0.28);

      for (const ap of scene.apMarkers) {
        const px = rx + ap.x * pixelsPerMeter;
        const py = ry + ap.y * pixelsPerMeter;
        drawCoverageZone(px, py, scene.apRadiusM, 0.16, 0.22);
      }

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
        ctx.arc(px, py, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.accentFg;
        ctx.font = "bold 8px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("AP", px, py + 0.5);
      }

      ctx.restore();

      ctx.lineWidth = 3;
      ctx.strokeStyle = wallColor;
      ctx.strokeRect(rx, ry, roomW, roomH);

      if (showCalculated) {
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
            ? dark
              ? "rgba(250,250,250,0.28)"
              : "rgba(22,119,255,0.28)"
            : dark
              ? "rgba(250,250,250,0.5)"
              : "rgba(22,119,255,0.48)";
          ctx.lineWidth = dashed ? 1.2 : 2.2;
          if (dashed) ctx.setLineDash([5, 6]);
          ctx.stroke();
          ctx.restore();
        };

        if (scene.switchMarkers.length === 0) {
          scene.clients.forEach((client) => {
            if (client.type === "📱") return;
            drawCable(
              cx,
              cy,
              rx + client.x * pixelsPerMeter,
              ry + client.y * pixelsPerMeter,
            );
          });
          scene.apMarkers.forEach((ap) => {
            drawCable(
              cx,
              cy,
              rx + ap.x * pixelsPerMeter,
              ry + ap.y * pixelsPerMeter,
            );
          });
        } else if (scene.switchMarkers.length > 0) {
          const switchPx = scene.switchMarkers.map((sw) => ({
            x: rx + sw.x * pixelsPerMeter,
            y: ry + sw.y * pixelsPerMeter,
          }));
          drawCable(cx, cy, switchPx[0].x, switchPx[0].y, false);
          for (let i = 1; i < switchPx.length; i++) {
            drawCable(switchPx[0].x, switchPx[0].y, switchPx[i].x, switchPx[i].y, false);
          }
          const endpoints = collectLanEndpoints(scene);
          const assignments =
            activeSwitchPlan &&
            scene.switchMarkers.length === activeSwitchPlan.quantity
              ? assignLanEndpointsToSwitches(
                  endpoints,
                  scene.switchMarkers,
                  activeSwitchPlan.product,
                )
              : endpoints.map((endpoint) => {
                  let best = 0;
                  let bestDist = Infinity;
                  scene.switchMarkers.forEach((sw, index) => {
                    const dist = Math.hypot(endpoint.x - sw.x, endpoint.y - sw.y);
                    if (dist < bestDist) {
                      bestDist = dist;
                      best = index;
                    }
                  });
                  return best;
                });
          let endpointIndex = 0;
          scene.clients.forEach((client) => {
            if (client.type === "📱") return;
            const swIndex = assignments[endpointIndex++] ?? 0;
            const sp = switchPx[swIndex];
            drawCable(
              sp.x,
              sp.y,
              rx + client.x * pixelsPerMeter,
              ry + client.y * pixelsPerMeter,
            );
          });
          scene.apMarkers.forEach((ap) => {
            const swIndex = assignments[endpointIndex++] ?? 0;
            const sp = switchPx[swIndex];
            drawCable(
              sp.x,
              sp.y,
              rx + ap.x * pixelsPerMeter,
              ry + ap.y * pixelsPerMeter,
            );
          });
        }
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

      if (scene.switchMarkers.length > 0) {
        ctx.font =
          '22px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = colors.router;
        scene.switchMarkers.forEach((sw) => {
          const sx2 = rx + sw.x * pixelsPerMeter;
          const sy2 = ry + sw.y * pixelsPerMeter;
          ctx.fillText(SWITCH_EMOJI, sx2, sy2);
        });
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
      }

      ctx.fillStyle = labelColor;
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${numbers.width} м`, rx + roomW / 2, ry - 10);
      ctx.save();
      ctx.translate(rx - 14, ry + roomH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${numbers.length} м`, 0, 0);
      ctx.restore();

    };

    paint();
    window.addEventListener("resize", paint);
    return () => window.removeEventListener("resize", paint);
  }, [numbers, scene, showCalculated, dark, activeSwitchPlan]);

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

    for (let i = 0; i < s.switchMarkers.length; i++) {
      const sw = s.switchMarkers[i];
      const sx = g.rx + sw.x * g.ppm;
      const sy = g.ry + sw.y * g.ppm;
      const dS = Math.hypot(ex - sx, ey - sy);
      if (dS < 24) {
        hits.push({
          d: dS,
          state: { kind: "switch", index: i, grabDx: ex - sx, grabDy: ey - sy },
        });
      }
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
      if (d < 22) hits.push({ d, state: { kind: "ap", index: i, grabDx: ex - px, grabDy: ey - py } });
    }

    if (hits.length === 0) return null;
    const dragPriority = (kind: DragKind) =>
      kind === "switch" ? 0 : kind === "router" ? 1 : kind === "ap" ? 2 : 3;
    hits.sort((a, b) => {
      const pa = dragPriority(a.state.kind);
      const pb = dragPriority(b.state.kind);
      if (pa !== pb) return pa - pb;
      return a.d - b.d;
    });
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
    const d = dragRef.current;
    const canvas = canvasRef.current;
    if (canvas && d) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
      finalizeWirelessDragLayout(d.kind, d.index);
    }
    dragRef.current = null;
  };

  const update = (key: keyof FormState, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const canAdd = isCustomer(user) && recommendation.length > 0;
  const hasScene = scene !== null;

  return (
      <div className="ns-net-builder w-full min-w-0 mx-auto pb-10">
      <div className="text-center mb-8">
        <h1 className="ns-page-hero__title text-3xl sm:text-4xl font-semibold text-ns-text">
          Конструктор сети
        </h1>
        <p className="text-sm text-ns-muted mt-2">
          Подбор оборудования по размерам помещения и числу устройств
        </p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] gap-4 lg:gap-5">
        <div className="space-y-4">
          <div className="aurora-card rounded-2xl p-4 sm:p-5 space-y-4">
            <p className="ns-net-builder__section-label">Параметры</p>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className={labelCls}>Ширина, м</label>
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
                <label className={labelCls}>Длина, м</label>
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
                      className={`flex-1 h-[38px] sm:h-[40px] px-3 rounded-[var(--radius-btn)] text-sm font-medium transition-colors ${
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
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={calculateLayout}
                disabled={!hasScene}
                className="aurora-button inline-flex items-center justify-center px-4 py-2 text-sm font-medium transition-transform hover:scale-[1.01] disabled:opacity-55"
              >
                Рассчитать
              </button>
              <button
                type="button"
                onClick={resetLayout}
                disabled={!hasScene}
                className="ns-btn ns-btn-secondary px-4 py-1.5 text-sm disabled:opacity-55"
              >
                Сброс
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!showCalculated && (
                <span className="ns-net-builder__hint">
                  После расчёта отображаются кабели на схеме и перечень оборудования
                </span>
              )}
            </div>
          </div>

          <div className="aurora-card rounded-2xl p-2.5 sm:p-3 space-y-2">
            <p className="ns-net-builder__section-label mb-0">Схема</p>
            {!showCalculated && hasScene && (
              <p className="ns-net-builder__hint -mt-1">
                Перетаскивайте устройства на схеме. После расчёта схема обновляется в реальном времени
              </p>
            )}
            <div
              className="ns-net-builder__canvas-shell w-full"
              style={{
                aspectRatio: `${Math.max(1, numbers.width)} / ${Math.max(1, numbers.length)}`,
                maxHeight: "min(54vh, 480px)",
                minHeight: "260px",
              }}
            >
              <canvas
                ref={canvasRef}
                className={`h-full w-full rounded-lg touch-none bg-ns-elevated ${hasScene ? "cursor-grab active:cursor-grabbing" : ""}`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
            </div>
            <div className="ns-net-builder__legend" aria-label="Легенда">
              {SCHEME_LEGEND.map(({ mark, label }) => (
                <span key={label} className="ns-net-builder__legend-item">
                  {mark} · {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2.5 lg:sticky lg:top-[calc(var(--ns-height-nav)+12px)] lg:self-start">
          <div className="aurora-card rounded-2xl p-4 sm:p-5">
            <p className="ns-net-builder__kit-title mb-3">Рекомендуемый комплект</p>
            {!showCalculated && (
              <div className="ns-net-builder__empty">
                <span className="ns-net-builder__empty-icon" aria-hidden>
                  <Package size={18} strokeWidth={1.5} />
                </span>
                <p className="ns-net-builder__empty-title">Выполните расчёт для подбора комплекта</p>
                <p className="ns-net-builder__empty-note">
                  Маршрутизатор, коммутатор, точки доступа, патч-корды
                </p>
              </div>
            )}
            {showCalculated && recommendation.length === 0 && (
              <div className="ns-net-builder__empty">
                <p className="ns-net-builder__empty-title">Нет подходящих позиций</p>
                <p className="ns-net-builder__empty-note">
                  Уточните размеры помещения или тип объекта
                </p>
              </div>
            )}
            {showCalculated && recommendation.length > 0 && (
              <p className="ns-net-builder__hint mb-2">
                Комплект пересчитывается при изменении схемы
              </p>
            )}
            <div className="space-y-2">
              {recommendation.map((item) => (
                <Link
                  key={item.product.id}
                  to={`/catalog/${item.product.slug}`}
                  className="ns-net-builder__kit-item flex gap-2.5 p-2.5 rounded-xl transition-colors min-w-0"
                >
                  <div className="w-11 h-11 rounded-lg ns-thumb flex items-center justify-center shrink-0 overflow-hidden">
                    {item.product.imageUrl ? (
                      <MediaImage
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-ns-muted">–</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ns-text truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-ns-muted mt-0.5 leading-snug line-clamp-2">
                      {item.reason}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-xs sm:text-sm">
                      <span className="text-ns-muted">
                        × {item.quantity}
                      </span>
                      <span className="font-semibold text-ns-text">
                        <Price value={Number(item.product.price) * item.quantity} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {recommendation.length > 0 && (
              <div className="ns-net-builder__total space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-ns-text-secondary">
                    Итого
                  </span>
                  <span className="text-base font-semibold text-ns-text tabular-nums">
                    <Price value={totalPrice} />
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
