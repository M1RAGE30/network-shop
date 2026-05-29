type Specs = Record<string, string> | null | undefined;

export interface ProductSelectorInput {
  id: number;
  name: string;
  price: number;
  specs?: Specs;
}

export interface SelectionScore {
  product: ProductSelectorInput;
  score: number;
}

function normalized(text: string): string {
  return text.toLowerCase().replace(",", ".");
}

function allSpecText(product: ProductSelectorInput): string {
  const parts = [product.name];
  if (product.specs) {
    for (const [k, v] of Object.entries(product.specs)) {
      parts.push(k, v);
    }
  }
  return normalized(parts.join(" "));
}

function extractNumberNear(text: string, marker: RegExp): number | null {
  const m = text.match(marker);
  if (!m) return null;
  const value = Number(m[1]);
  return Number.isFinite(value) ? value : null;
}

export function getPortCount(product: ProductSelectorInput): number {
  const text = allSpecText(product);
  const portsByMarker =
    extractNumberNear(text, /(\d{1,3})\s*(?:x)?\s*(?:lan|порт|ports?)/i) ??
    extractNumberNear(text, /(?:lan|порт|ports?)\D{0,12}(\d{1,3})/i) ??
    extractNumberNear(text, /(\d{1,3})\s*p\b/i);
  return portsByMarker ?? 4;
}

export function getWifiGeneration(product: ProductSelectorInput): number {
  const text = allSpecText(product);
  if (/wifi\s*7|802\.11be/.test(text)) return 7;
  if (/wifi\s*6e|6e/.test(text)) return 6.5;
  if (/wifi\s*6|802\.11ax/.test(text)) return 6;
  if (/wifi\s*5|802\.11ac/.test(text)) return 5;
  if (/wifi\s*4|802\.11n/.test(text)) return 4;
  return 4;
}

export function getBandCount(product: ProductSelectorInput): number {
  const text = allSpecText(product);
  const has24 = /2\.4\s*ghz|2,4\s*ghz/.test(text);
  const has5 = /5\s*ghz/.test(text);
  const has6 = /6\s*ghz|6e/.test(text);
  return Number(has24) + Number(has5) + Number(has6);
}

export function getCoverageM2(product: ProductSelectorInput): number {
  const text = allSpecText(product);
  const m2 =
    extractNumberNear(text, /(\d{2,4})\s*m2/) ??
    extractNumberNear(text, /(\d{2,4})\s*м2/) ??
    extractNumberNear(text, /(\d{2,4})\s*кв/);
  if (m2) return m2;
  const antennas = getAntennaCount(product);
  return 70 + antennas * 20;
}

export function getAntennaCount(product: ProductSelectorInput): number {
  const text = allSpecText(product);
  const count =
    extractNumberNear(text, /(\d{1,2})\s*(?:антенн|antenna)/) ??
    extractNumberNear(text, /(?:антенн|antenna)\D{0,10}(\d{1,2})/);
  return count ?? 2;
}

export function getMaxSpeedMbps(product: ProductSelectorInput): number {
  const text = allSpecText(product);
  if (/10g|10000\s*mbps|10gbe/.test(text)) return 10000;
  if (/2\.5g|2500\s*mbps/.test(text)) return 2500;
  if (/1g|1000\s*mbps|gigabit/.test(text)) return 1000;
  if (/100\s*mbps/.test(text)) return 100;
  return 1000;
}

export function hasPoe(product: ProductSelectorInput): boolean {
  return /\bpoe\b/.test(allSpecText(product));
}

export function scoreRouter(
  product: ProductSelectorInput,
  params: {
    totalClients: number;
    wiredClients: number;
    area: number;
    spaceType: "office" | "home";
  },
): number {
  const ports = getPortCount(product);
  const wifiGen = getWifiGeneration(product);
  const bands = getBandCount(product);
  const speed = getMaxSpeedMbps(product);
  const coverage = getCoverageM2(product);
  const antennas = getAntennaCount(product);

  const portsTarget = Math.max(4, Math.min(16, params.wiredClients + 2));
  const speedTarget = params.totalClients > 20 ? 2500 : 1000;
  const coverageTarget = Math.max(80, params.area * 0.55);

  const portsScore = Math.max(0, 20 - Math.abs(ports - portsTarget) * 2.2);
  const speedScore = Math.min(18, (speed / speedTarget) * 18);
  const wifiScore = wifiGen * 5;
  const bandsScore = bands >= 3 ? 12 : bands === 2 ? 8 : 3;
  const coverageScore = Math.min(16, (coverage / coverageTarget) * 16);
  const antennaScore = Math.min(8, antennas * 2);
  const officeBonus = params.spaceType === "office" && hasPoe(product) ? 6 : 0;
  const valuePenalty = Number(product.price) * 0.0065;

  return (
    portsScore +
    speedScore +
    wifiScore +
    bandsScore +
    coverageScore +
    antennaScore +
    officeBonus -
    valuePenalty
  );
}

export function scoreSwitch(
  product: ProductSelectorInput,
  params: {
    portsNeeded: number;
    preferManaged: boolean;
    office: boolean;
  },
): number {
  const text = allSpecText(product);
  const ports = getPortCount(product);
  const speed = getMaxSpeedMbps(product);
  const managed = /managed|управляем/.test(text);
  const poe = hasPoe(product);

  const capacityScore = Math.max(0, 28 - Math.abs(ports - params.portsNeeded) * 3);
  const speedScore = Math.min(20, (speed / 1000) * 12 + (speed > 1000 ? 8 : 0));
  const managedScore = params.preferManaged ? (managed ? 12 : 0) : managed ? 4 : 6;
  const poeScore = params.office ? (poe ? 10 : 0) : poe ? 2 : 4;
  const pricePenalty = Number(product.price) * 0.006;

  return capacityScore + speedScore + managedScore + poeScore - pricePenalty;
}

export function scoreAccessPoint(
  product: ProductSelectorInput,
  params: {
    clientsPerAp: number;
    areaPerAp: number;
    office: boolean;
  },
): number {
  const wifiGen = getWifiGeneration(product);
  const bands = getBandCount(product);
  const coverage = getCoverageM2(product);
  const speed = getMaxSpeedMbps(product);
  const poe = hasPoe(product);

  const clientTargetSpeed = params.clientsPerAp > 15 ? 2500 : 1000;
  const speedScore = Math.min(18, (speed / clientTargetSpeed) * 18);
  const wifiScore = wifiGen * 5;
  const bandsScore = bands >= 3 ? 10 : bands === 2 ? 7 : 2;
  const coverageScore = Math.min(20, (coverage / params.areaPerAp) * 20);
  const poeScore = params.office ? (poe ? 8 : 0) : poe ? 3 : 2;
  const pricePenalty = Number(product.price) * 0.0058;

  return wifiScore + bandsScore + coverageScore + speedScore + poeScore - pricePenalty;
}

export function scoreAdapter(product: ProductSelectorInput): number {
  const speed = getMaxSpeedMbps(product);
  const text = allSpecText(product);
  const usb3 = /usb\s*3|usb3|3\.0/.test(text);
  const score = (speed >= 2500 ? 22 : speed >= 1000 ? 16 : 7) + (usb3 ? 8 : 2);
  return score - Number(product.price) * 0.008;
}

export type PickBestTieBreak = "lower_price" | "prefer_performance";

function performanceRank(product: ProductSelectorInput): number {
  return (
    getCoverageM2(product) * 2 +
    getPortCount(product) * 5 +
    getWifiGeneration(product) * 8 +
    getMaxSpeedMbps(product) / 200 +
    getBandCount(product) * 3
  );
}

export function pickBest<T extends ProductSelectorInput>(
  products: T[],
  scorer: (p: T) => number,
  tieBreak: PickBestTieBreak = "prefer_performance",
): T | null {
  if (products.length === 0) return null;
  let best = products[0];
  let bestScore = scorer(best);
  const eps = 1e-6;
  for (let i = 1; i < products.length; i++) {
    const p = products[i];
    const score = scorer(p);
    if (score > bestScore + eps) {
      best = p;
      bestScore = score;
      continue;
    }
    if (Math.abs(score - bestScore) > eps) continue;

    if (tieBreak === "lower_price") {
      const pa = Number(p.price);
      const pb = Number(best.price);
      if (pa < pb || (pa === pb && p.id < best.id)) {
        best = p;
      }
      continue;
    }

    const ra = performanceRank(p);
    const rb = performanceRank(best);
    if (ra > rb || (ra === rb && p.id < best.id)) {
      best = p;
    }
  }
  return best;
}

export function getEstimatedRangePx(
  product: ProductSelectorInput,
  fallback: number,
): number {
  const coverage = getCoverageM2(product);
  const wifiGen = getWifiGeneration(product);
  const bands = getBandCount(product);
  const radiusFromArea = Math.sqrt(coverage / Math.PI) * 11.5;
  const techBonus = wifiGen * 4 + bands * 6;
  return Math.max(90, Math.min(320, fallback + radiusFromArea + techBonus));
}

const WIFI_REF_AREA_M2 = 120;

export function wifiCoverageRadiusM(product: ProductSelectorInput): number {
  const m2 = getCoverageM2(product);
  return Math.max(2, Math.round(Math.sqrt(m2 / Math.PI)));
}

export function wifiHeatmapRadiusPx(
  product: ProductSelectorInput,
  isRouter: boolean,
  targetAreaM2: number,
): number {
  const fallback = isRouter ? 220 : 160;
  const base = getEstimatedRangePx(product, fallback);
  const area = Math.max(10, Math.min(1500, targetAreaM2));
  const scale = Math.sqrt(WIFI_REF_AREA_M2 / area);
  return Math.max(48, Math.min(400, base * scale));
}

function wifiRightSizeScore(
  coverageM2: number,
  areaM2: number,
  isRouter: boolean,
): number {
  const area = Math.max(10, Math.min(1500, areaM2));
  const lowMul = isRouter ? 0.78 : 0.72;
  const highMul = isRouter ? 2.35 : 2.15;
  const needLow = Math.max(isRouter ? 24 : 20, area * lowMul);
  const needHigh = Math.max(needLow + 18, area * highMul);
  if (coverageM2 < needLow) {
    return 26 * (coverageM2 / needLow);
  }
  if (coverageM2 <= needHigh) {
    const mid = (needLow + needHigh) / 2;
    const half = (needHigh - needLow) / 2 || 1;
    return 26 + 22 * (1 - Math.abs(coverageM2 - mid) / half);
  }
  const over = coverageM2 / needHigh;
  return Math.max(6, 48 - (over - 1) * 30);
}

export function scoreWifiConstructorRouter(
  product: ProductSelectorInput,
  areaM2: number,
  totalClients: number,
): number {
  const area = Math.max(10, Math.min(1500, areaM2));
  const cov = getCoverageM2(product);
  const price = Math.max(1, Number(product.price));
  const fit = wifiRightSizeScore(cov, area, true);
  const value = Math.min(24, (Math.sqrt(cov) * 14) / Math.sqrt(price));
  const tech = scoreRouter(product, {
    totalClients: Math.max(2, totalClients),
    wiredClients: Math.max(1, Math.round(totalClients * 0.22)),
    area,
    spaceType: area > 160 ? "office" : "home",
  });
  return fit + value + tech * 0.32;
}

export function scoreWifiConstructorAp(
  product: ProductSelectorInput,
  areaM2: number,
  clientsPerAp: number,
): number {
  const area = Math.max(10, Math.min(1500, areaM2));
  const cov = getCoverageM2(product);
  const price = Math.max(1, Number(product.price));
  const fit = wifiRightSizeScore(cov, area, false);
  const value = Math.min(24, (Math.sqrt(cov) * 13) / Math.sqrt(price));
  const tech = scoreAccessPoint(product, {
    clientsPerAp: Math.max(2, clientsPerAp),
    areaPerAp: Math.max(25, area),
    office: area > 140,
  });
  return fit + value + tech * 0.3;
}

