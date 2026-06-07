export type SpecFilterMode = "exact" | "gte" | "lte";

const GTE_SPEC_KEYS = new Set(["Максимальная скорость связи"]);

const LTE_SPEC_KEYS = new Set(["Длина кабеля"]);

export function getSpecFilterMode(key: string): SpecFilterMode {
  if (LTE_SPEC_KEYS.has(key)) return "lte";
  if (GTE_SPEC_KEYS.has(key)) return "gte";
  return "exact";
}

export function normalizeSpecDisplayValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const plainNumber = trimmed.match(/^(-?\d+)(?:[.,](\d+))?$/);
  if (plainNumber) {
    const intPart = plainNumber[1];
    const frac = plainNumber[2];
    if (!frac || /^0+$/.test(frac)) return intPart;
    return `${intPart},${frac.replace(/0+$/, "") || "0"}`;
  }

  return trimmed;
}

function parseNumericSpec(value: string): number | null {
  const numbers = value.match(/\d+(?:[.,]\d+)?/g);
  if (!numbers?.length) return null;
  const parsed = numbers.map((part) => Number(part.replace(",", ".")));
  return Math.max(...parsed);
}

function isRangeFilterValue(value: string): boolean {
  const trimmed = value.trim();
  if (/^(да|нет|yes|no)$/i.test(trimmed)) return false;
  return parseNumericSpec(trimmed) != null;
}

export function formatSpecFilterOption(key: string, value: string): string {
  const display = normalizeSpecDisplayValue(value);
  const mode = getSpecFilterMode(key);
  if (mode === "gte" && isRangeFilterValue(display)) return `от ${display}`;
  if (mode === "lte" && isRangeFilterValue(display)) return `до ${display}`;
  return display;
}

export function sanitizeSpecFilterValues(key: string, values: string[]): string[] {
  if (key === "Количество антенн") {
    return values.filter((value) => !/^(нет|no)$/i.test(value.trim()));
  }
  return values;
}

export const CATEGORY_EXCLUDED_SPEC_KEYS: Record<string, readonly string[]> = {
  "usb-adapters": ["Размеры"],
  routers: [
    "Диагональ",
    "Разрешение",
    "Соотношение сторон экрана",
    "Тип экрана",
    "Тип подсветки экрана",
    "Форма экрана",
    "Частота матрицы",
    "Расширенный динамический диапазон (HDR)",
    "Smart TV",
    "TV-тюнер",
    "Композитный вход (AV)",
    "Компонентный вход (Y/Pb/Pr)",
    "Крепление VESA",
    "Количество входов HDMI",
    "Количество входов USB",
    "Аудиосистема",
    "Сабвуфер",
    "Мощность аудиосистемы",
    "Аудиовыход (разъем 3.5 мм)",
    "Цифровой аудиовыход (оптический)",
    "Вес без подставки",
    "Вес с подставкой",
    "Высота без подставки",
    "Высота с подставкой",
    "Глубина без подставки",
    "Глубина с подставкой",
    "Ширина",
    "Подключение мышь+клавиатура",
    "Управление голосом",
    "Управление со смартфона",
    "Операционная система",
    "Ethernet",
    "Wi-Fi",
  ],
  storage: ["Ширина", "Высота", "Глубина", "Вес", "Память", "Процессор", "Вентилятор"],
};

export function getExcludedSpecKeysForCategory(categorySlug: string): Set<string> {
  return new Set(CATEGORY_EXCLUDED_SPEC_KEYS[categorySlug] ?? []);
}

export function stripExcludedSpecFilters(
  categorySlug: string,
  filters: Record<string, string>,
): Record<string, string> {
  const excluded = getExcludedSpecKeysForCategory(categorySlug);
  if (!excluded.size) return filters;
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (!excluded.has(key)) next[key] = value;
  }
  return next;
}

export function isMeaningfulSpecFilterValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120) return false;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return false;
  return true;
}

export function sortSpecFilterValues(key: string, values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const raw of values) {
    if (!isMeaningfulSpecFilterValue(raw)) continue;
    const normalized = normalizeSpecDisplayValue(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }

  return sanitizeSpecFilterValues(
    key,
    unique.sort((a, b) =>
      a.localeCompare(b, "ru", { numeric: true, sensitivity: "base" }),
    ),
  );
}

export function parseSpecFilters(value: string | null): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

export function countAppliedCatalogFilters(
  params: URLSearchParams,
  specFilters: Record<string, string>,
): number {
  let count = 0;
  if (params.get("brand")) count += 1;
  if (params.get("minPrice") || params.get("maxPrice")) count += 1;
  count += Object.keys(specFilters).length;
  return count;
}
