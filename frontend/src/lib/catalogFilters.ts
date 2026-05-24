/** Явные подписи — без усечения префиксов вроде «Количество …» → «Антенн». */
const SPEC_FILTER_LABEL_OVERRIDES: Record<string, string> = {
  "Количество антенн": "Количество антенн",
  "Съёмная антенна": "Съёмная антенна",
  "Количество портов": "Количество портов",
  "Количество отсеков": "Количество отсеков",
  "Всего LAN-портов": "LAN-порты",
  "Всего портов": "Всего портов",
  "Максимальная скорость связи": "Макс. скорость Wi‑Fi",
  "Скорость передачи данных": "Скорость передачи",
  "Длина кабеля": "Длина кабеля",
  "Категория кабеля": "Категория кабеля",
  "Интерфейс подключения": "Интерфейс",
  "Стандарты беспроводной связи": "Wi‑Fi стандарт",
  "Диапазон частот": "Диапазон частот",
  "Поддержка Gigabit Ethernet": "Gigabit Ethernet",
  "Поддержка сотовой связи": "Сотовая связь",
  "Скорость портов": "Скорость портов",
  "Порты USB": "USB",
};

export function formatSpecFilterLabel(key: string, preferredLabel?: string) {
  if (preferredLabel) return preferredLabel;
  if (SPEC_FILTER_LABEL_OVERRIDES[key]) return SPEC_FILTER_LABEL_OVERRIDES[key];

  const support = key.match(/^Поддержка\s+(.+)$/i);
  if (support) {
    const rest = support[1].trim();
    return rest.charAt(0).toUpperCase() + rest.slice(1);
  }

  return key;
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
