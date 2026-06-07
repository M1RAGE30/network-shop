import { normalizeSpecDisplayValue } from "./catalogFilters";

const KIT_SPEC_KEYS: Record<string, string[]> = {
  routers: [
    "Стандарты беспроводной связи",
    "Диапазон частот",
    "Всего LAN-портов",
  ],
  switches: [
    "Количество портов Ethernet",
    "Тип коммутатора",
    "Скорость пересылки пакетов",
  ],
  "access-points": [
    "Стандарты беспроводной связи",
    "Диапазон частот",
    "Количество антенн",
  ],
  "wifi-adapters": [
    "Стандарты беспроводной связи",
    "Максимальная скорость связи",
    "Количество антенн",
  ],
  "usb-adapters": ["Интерфейсы устройства", "Стандарты"],
  "patch-cords": ["Длина кабеля", "Цвет"],
};

const FALLBACK_SPEC_KEYS = [
  "Стандарты беспроводной связи",
  "Диапазон частот",
  "Максимальная скорость связи",
  "Количество портов Ethernet",
  "Всего LAN-портов",
  "Длина кабеля",
  "Количество антенн",
  "Тип",
];

function isEmptySpecValue(value: string): boolean {
  const trimmed = value.trim();
  return !trimmed || /^нет$/i.test(trimmed);
}

export function productSpecSummary(
  product: {
    specs?: Record<string, string> | null;
    category?: { slug?: string } | null;
  },
  limit = 3,
): string {
  const specs = product.specs ?? {};
  const slug = product.category?.slug ?? "";
  const preferred = KIT_SPEC_KEYS[slug] ?? FALLBACK_SPEC_KEYS;
  const chunks: string[] = [];

  for (const key of preferred) {
    const raw = specs[key];
    if (!raw || isEmptySpecValue(String(raw))) continue;
    chunks.push(`${key}: ${normalizeSpecDisplayValue(String(raw))}`);
    if (chunks.length >= limit) break;
  }

  if (chunks.length === 0) {
    for (const [key, value] of Object.entries(specs)) {
      if (key === "Бренд" || isEmptySpecValue(String(value))) continue;
      if (key.startsWith("_") || key.length > 48) continue;
      chunks.push(`${key}: ${normalizeSpecDisplayValue(String(value))}`);
      if (chunks.length >= limit) break;
    }
  }

  return chunks.join(" · ");
}
