type Specs = Record<string, string> | null | undefined;

export interface ProductSelectorInput {
  id: number;
  name: string;
  price: number;
  specs?: Specs;
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
  const ethernetSpec =
    extractNumberNear(text, /количество портов ethernet\D{0,10}(\d{1,3})/i) ??
    extractNumberNear(text, /(\d{1,3})\D{0,6}портов ethernet/i);
  if (ethernetSpec != null) return ethernetSpec;

  const portsByMarker =
    extractNumberNear(text, /(\d{1,3})\s*(?:x)?\s*(?:lan|порт|ports?)/i) ??
    extractNumberNear(text, /(?:lan|порт|ports?)\D{0,12}(\d{1,3})/i) ??
    extractNumberNear(text, /(\d{1,3})\s*(?:lan|rj-?45)/i);
  return portsByMarker ?? 4;
}

export function getRouterLanPortCount(product: ProductSelectorInput): number {
  const text = allSpecText(product);
  const totalLan =
    extractNumberNear(text, /всего lan-?портов\D{0,10}(\d{1,2})/i) ??
    extractNumberNear(text, /(\d{1,2})\D{0,6}всего lan-?портов/i);
  if (totalLan != null) return Math.min(12, Math.max(1, totalLan));

  const explicit =
    extractNumberNear(text, /(\d{1,2})\s*(?:x\s*)?(?:lan|rj-?45|порт\w*)/i) ??
    extractNumberNear(text, /(?:lan|порт\w*|rj-?45)\D{0,12}(\d{1,2})/i);
  if (explicit != null) return Math.min(12, Math.max(1, explicit));
  const generic = getPortCount(product);
  return Math.min(8, Math.max(1, generic));
}

export function isUnmanagedSwitch(product: ProductSelectorInput): boolean {
  return /неуправляем|unmanaged/i.test(allSpecText(product));
}

export function isManagedSwitch(product: ProductSelectorInput): boolean {
  if (isUnmanagedSwitch(product)) return false;
  return /управляем|managed/i.test(allSpecText(product));
}

export function isSmartSwitch(product: ProductSelectorInput): boolean {
  if (isUnmanagedSwitch(product)) return false;
  return /настраиваем|smart/i.test(allSpecText(product));
}

function hasSpecYes(text: string, label: string): boolean {
  const pattern = new RegExp(`${label}\\D{0,12}(да|yes)`, "i");
  return pattern.test(text);
}

export function scoreOfficeRouterFeatures(product: ProductSelectorInput): number {
  const text = allSpecText(product);
  let score = 0;

  if (hasSpecYes(text, "поддержка 802\\.1x")) score += 6;
  if (hasSpecYes(text, "vpn-сервер")) score += 5;
  if (hasSpecYes(text, "статическая маршрутизация")) score += 4;
  if (hasSpecYes(text, "приоритизация трафика \\(qos\\)")) score += 4;
  if (hasSpecYes(text, "поддержка gigabit ethernet")) score += 3;
  if (hasPoe(product)) score += 4;
  if (getWifiGeneration(product) >= 6) score += 4;
  if (getBandCount(product) >= 2) score += 2;

  if (/mesh|halo|deco|nova|wi-fi система|бесшовн/i.test(text)) score -= 14;
  if (/репитер|повторитель|усилитель|extender|repeater/i.test(text)) score -= 16;

  return score;
}

export function scoreOfficeApFeatures(product: ProductSelectorInput): number {
  const text = allSpecText(product);
  let score = 0;

  if (/точка доступа|access point|\beap[\d-]/i.test(text)) score += 8;
  if (/потолочн|ceiling/i.test(text)) score += 4;
  if (/репитер|повторитель|усилитель|extender|repeater/i.test(text)) score -= 14;
  if (getWifiGeneration(product) >= 6) score += 3;
  if (hasPoe(product)) score += 3;

  return score;
}

export function scoreOfficeSwitchFeatures(product: ProductSelectorInput): number {
  const text = allSpecText(product);
  let score = 0;

  if (isUnmanagedSwitch(product)) score -= 16;
  if (/стоечн|rack|19"/i.test(text)) score += 3;
  if (/gigabit ethernet\D{0,10}да/i.test(text)) score += 2;
  if (getMaxSpeedMbps(product) >= 2500) score += 3;

  return score;
}

export function getWifiGeneration(product: ProductSelectorInput): number {
  const text = allSpecText(product);
  if (/wifi\s*7|802\.11be/.test(text)) return 7;
  if (/wifi\s*6e|\b6e\b/.test(text)) return 6.5;
  if (/wifi\s*6|802\.11ax/.test(text)) return 6;
  if (/wifi\s*5|802\.11ac/.test(text)) return 5;
  if (/wifi\s*4|802\.11n/.test(text)) return 4;
  return 4;
}

export function getBandCount(product: ProductSelectorInput): number {
  const text = allSpecText(product);
  const has24 = /2\.4\s*ghz|2,4\s*ghz/.test(text);
  const has5 = /5\s*ghz/.test(text);
  const has6 = /6\s*ghz|\b6e\b/.test(text);
  return Number(has24) + Number(has5) + Number(has6);
}

export function getCoverageM2(product: ProductSelectorInput): number {
  const specs = product.specs ?? {};
  for (const [key, value] of Object.entries(specs)) {
    if (!/покрыт|площад/i.test(key)) continue;
    const match = normalized(String(value)).match(
      /(\d{1,4})\s*(?:м2|m2|м²|кв\.?\s*м)/,
    );
    if (match) {
      return Math.min(450, Math.max(25, Number(match[1])));
    }
  }
  const antennas = getAntennaCount(product);
  return Math.min(280, Math.max(60, 55 + antennas * 16));
}

export function wifiRadiusM(
  product: ProductSelectorInput,
  roomWidth?: number,
  roomLength?: number,
): number {
  const fromCoverage = Math.max(2, Math.sqrt(getCoverageM2(product) / Math.PI));
  if (!roomWidth || !roomLength) {
    return Math.round(fromCoverage * 10) / 10;
  }
  const cap = Math.max(roomWidth, roomLength) * 0.5;
  return Math.round(Math.min(fromCoverage, cap) * 10) / 10;
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

export function getPoePortCount(product: ProductSelectorInput): number {
  const text = allSpecText(product);
  const explicit =
    extractNumberNear(text, /(\d{1,2})\s*(?:x\s*)?poe/i) ??
    extractNumberNear(text, /poe\D{0,10}(\d{1,2})/i) ??
    extractNumberNear(text, /(\d{1,2})\s*(?:poe|порт\w*)\s*poe/i);
  if (explicit != null) return explicit;
  if (!hasPoe(product)) return 0;
  return Math.max(1, Math.floor(getPortCount(product) * 0.55));
}

export function valueScore(techScore: number, price: number): number {
  return techScore / Math.max(1, Number(price));
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
  const officeBonus =
    params.spaceType === "office"
      ? scoreOfficeRouterFeatures(product) + (hasPoe(product) ? 4 : 0)
      : 0;
  const priceFactor = params.spaceType === "office" ? 0.0042 : 0.0065;
  const valuePenalty = Number(product.price) * priceFactor;

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
    poePortsNeeded?: number;
  },
): number {
  const ports = getPortCount(product);
  const speed = getMaxSpeedMbps(product);
  const managed = isManagedSwitch(product);
  const smart = isSmartSwitch(product);
  const poe = hasPoe(product);
  const poePorts = getPoePortCount(product);
  const poeNeeded = params.poePortsNeeded ?? 0;

  const capacityScore = Math.max(0, 28 - Math.abs(ports - params.portsNeeded) * 3);
  const speedScore = Math.min(20, (speed / 1000) * 12 + (speed > 1000 ? 8 : 0));
  const managedScore = params.office
    ? managed
      ? 14
      : smart
        ? 9
        : isUnmanagedSwitch(product)
          ? -18
          : 0
    : isUnmanagedSwitch(product)
      ? 11
      : managed || smart
        ? -12
        : 6;
  const poeScore = params.office ? (poe ? 7 : -2) : poe ? 3 : 2;
  const poeFit =
    poeNeeded <= 0
      ? 0
      : poePorts >= poeNeeded
        ? 14
        : Math.max(-24, (poePorts - poeNeeded) * 8);
  const officeFeatures = params.office ? scoreOfficeSwitchFeatures(product) : 0;
  const priceFactor = params.office ? 0.0045 : 0.01;
  const pricePenalty = Number(product.price) * priceFactor;
  const homeRightSize =
    !params.office && ports >= params.portsNeeded && ports <= params.portsNeeded + 6
      ? 6
      : 0;

  return (
    capacityScore +
    speedScore +
    managedScore +
    poeScore +
    poeFit +
    officeFeatures +
    homeRightSize -
    pricePenalty
  );
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
  const poeScore = params.office ? (poe ? 6 : -2) : poe ? 3 : 2;
  const officeFeatures = params.office ? scoreOfficeApFeatures(product) : 0;
  const priceFactor = params.office ? 0.004 : 0.0058;
  const pricePenalty = Number(product.price) * priceFactor;

  return (
    wifiScore + bandsScore + coverageScore + speedScore + poeScore + officeFeatures - pricePenalty
  );
}

export function scoreAdapter(
  product: ProductSelectorInput,
  spaceType: "office" | "home" = "home",
): number {
  const speed = getMaxSpeedMbps(product);
  const text = allSpecText(product);
  const usb3 = /usb\s*3|usb3|3\.0/.test(text);
  const wifiGen = getWifiGeneration(product);
  let score = (speed >= 2500 ? 22 : speed >= 1000 ? 16 : 7) + (usb3 ? 8 : 2);
  if (spaceType === "office") {
    score += wifiGen >= 6 ? 6 : 0;
    score += speed >= 1000 ? 4 : 0;
  }
  const priceFactor = spaceType === "office" ? 0.002 : 0.008;
  return score - Number(product.price) * priceFactor;
}

export type PickBestTieBreak = "lower_price" | "prefer_performance";

export function performanceRank(product: ProductSelectorInput): number {
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

export const WIFI_SIGNAL_ZONE_BOUNDARIES = [0.3, 0.55, 0.8, 1] as const;

export function wifiRoomSideM(targetAreaM2: number): number {
  return Math.sqrt(Math.max(10, Math.min(1500, targetAreaM2)));
}

export function wifiCanvasMetersPerPx(
  targetAreaM2: number,
  canvasWidth: number,
  canvasHeight: number,
  padding = 40,
): number {
  const sideM = wifiRoomSideM(targetAreaM2);
  const drawablePx = Math.min(canvasWidth - padding, canvasHeight - padding);
  return sideM / Math.max(1, drawablePx);
}

export function wifiCoverageRadiusM(product: ProductSelectorInput): number {
  const m2 = getCoverageM2(product);
  return Math.round(Math.sqrt(m2 / Math.PI) * 10) / 10;
}

export function wifiSignalZoneBoundariesM(radiusM: number): number[] {
  if (radiusM <= 0) return [];
  return WIFI_SIGNAL_ZONE_BOUNDARIES.map(
    (ratio) => Math.round(radiusM * ratio * 10) / 10,
  );
}

export function formatCoverageMeters(meters: number): string {
  const rounded = Math.round(meters * 10) / 10;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace(".", ",");
  return `${text} м`;
}

export function wifiCoverageRadiusPx(
  product: ProductSelectorInput,
  targetAreaM2: number,
  canvasWidth = 720,
  canvasHeight = 480,
): number {
  const radiusM = wifiCoverageRadiusM(product);
  const metersPerPx = wifiCanvasMetersPerPx(
    targetAreaM2,
    canvasWidth,
    canvasHeight,
  );
  return radiusM / metersPerPx;
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
  spaceType: "office" | "home" = "home",
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
    spaceType,
  });
  if (spaceType === "office") {
    return fit + value * 0.55 + tech * 0.34;
  }
  const homeValueBonus = Math.min(6, value * 0.15);
  return fit + value + tech * 0.32 + homeValueBonus;
}

export function scoreWifiConstructorAp(
  product: ProductSelectorInput,
  areaM2: number,
  clientsPerAp: number,
  spaceType: "office" | "home" = "home",
): number {
  const area = Math.max(10, Math.min(1500, areaM2));
  const cov = getCoverageM2(product);
  const price = Math.max(1, Number(product.price));
  const fit = wifiRightSizeScore(cov, area, false);
  const value = Math.min(24, (Math.sqrt(cov) * 13) / Math.sqrt(price));
  const tech = scoreAccessPoint(product, {
    clientsPerAp: Math.max(2, clientsPerAp),
    areaPerAp: Math.max(25, area / Math.max(1, Math.ceil(area / 90))),
    office: spaceType === "office",
  });
  if (spaceType === "office") {
    return fit + value * 0.5 + tech * 0.32;
  }
  return fit + value + tech * 0.3;
}

