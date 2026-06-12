export interface RouterSetupGuide {
  title: string;
  intro: string;
  steps: string[];
  tip?: string;
}

export interface RouterProductInput {
  name: string;
  slug?: string;
  brand?: { name: string } | null;
  specs?: Record<string, string> | null;
}

type BrandKey =
  | "keenetic"
  | "tplink"
  | "asus"
  | "xiaomi"
  | "cudy"
  | "netcraze"
  | "tenda"
  | "mercusys"
  | "dlink"
  | "huawei"
  | "mikrotik"
  | "default";

const BRAND_UI: Record<
  BrandKey,
  { panel: string; defaultIp: string; app?: string }
> = {
  keenetic: {
    panel: "my.keenetic.net",
    defaultIp: "192.168.1.1",
    app: "Keenetic",
  },
  tplink: {
    panel: "tplinkwifi.net",
    defaultIp: "192.168.0.1",
    app: "TP-Link Tether",
  },
  asus: {
    panel: "router.asus.com",
    defaultIp: "192.168.50.1",
    app: "ASUS Router",
  },
  xiaomi: {
    panel: "miwifi.com",
    defaultIp: "192.168.31.1",
    app: "Mi Home / Xiaomi Home",
  },
  cudy: {
    panel: "192.168.10.1",
    defaultIp: "192.168.10.1",
    app: "Cudy",
  },
  netcraze: {
    panel: "192.168.1.1",
    defaultIp: "192.168.1.1",
    app: "Netcraze",
  },
  tenda: {
    panel: "192.168.0.1",
    defaultIp: "192.168.0.1",
    app: "Tenda WiFi",
  },
  mercusys: {
    panel: "mwlogin.net",
    defaultIp: "192.168.0.1",
    app: "Mercusys",
  },
  dlink: {
    panel: "192.168.0.1",
    defaultIp: "192.168.0.1",
  },
  huawei: {
    panel: "192.168.3.1",
    defaultIp: "192.168.3.1",
    app: "HUAWEI AI Life",
  },
  mikrotik: {
    panel: "192.168.88.1",
    defaultIp: "192.168.88.1",
  },
  default: {
    panel: "192.168.0.1",
    defaultIp: "192.168.0.1",
  },
};

function resolveBrandKey(brandName?: string): BrandKey {
  const b = (brandName ?? "").toLowerCase();
  if (b.includes("keenetic")) return "keenetic";
  if (b.includes("tp-link") || b.includes("tplink")) return "tplink";
  if (b.includes("asus")) return "asus";
  if (b.includes("xiaomi") || b.includes("redmi") || b.includes("mi ")) return "xiaomi";
  if (b.includes("cudy")) return "cudy";
  if (b.includes("netcraze")) return "netcraze";
  if (b.includes("tenda")) return "tenda";
  if (b.includes("mercusys")) return "mercusys";
  if (b.includes("d-link") || b.includes("dlink")) return "dlink";
  if (b.includes("huawei")) return "huawei";
  if (b.includes("mikrotik")) return "mikrotik";
  return "default";
}

function productContext(product: RouterProductInput) {
  const specs = product.specs ?? {};
  const blob = [product.name, ...Object.entries(specs).map(([k, v]) => `${k} ${v}`)]
    .join(" ")
    .toLowerCase();
  const name = product.name.toLowerCase();

  const cellularMode = specs["Способ подключения к сотовой связи"] ?? "";
  const has4g =
    /\b[45]g\b|lte/i.test(product.name) || /sim/i.test(cellularMode);

  const hasMesh =
    /mesh|wi-?fi\s*систем|halo|deco|\d\s*-?\s*pack|\d+\s*шт\b|комплект/i.test(
      name,
    );
  const dualBand = /2\.4|5\s*ghz|двухдиапазон|dual/i.test(blob);

  return { blob, has4g, hasMesh, dualBand, specs };
}

function connectionStep(
  ctx: ReturnType<typeof productContext>,
  brand: BrandKey,
): string {
  if (ctx.has4g) {
    return "В мастере выберите источник интернета: Ethernet (WAN) или SIM (4G/LTE). Для SIM при необходимости укажите APN оператора и дождитесь регистрации в сети.";
  }
  if (brand === "mikrotik") {
    return "Настройте WAN через Quick Set: DHCP-клиент на ether1, если провайдер не требует иного. Для PPPoE введите логин и пароль из договора с провайдером.";
  }
  return "Выберите тип подключения, указанный провайдером: чаще всего «Динамический IP» (DHCP) – настройки придут автоматически. Для PPPoE введите логин и пароль из договора, для статического IP – адрес, маску, шлюз и DNS.";
}

function brandIntro(brand: BrandKey, product: RouterProductInput): string {
  const ui = BRAND_UI[brand];
  const app = ui.app ? ` или приложение ${ui.app}` : "";
  return `Краткая инструкция первичной настройки. Модель: ${product.name}. Панель: http://${ui.panel} (или ${ui.defaultIp})${app}. Названия пунктов могут немного отличаться в прошивке.`;
}

export function isRouterProduct(category?: { slug?: string } | null): boolean {
  return category?.slug === "routers";
}

export function buildRouterSetupGuide(product: RouterProductInput): RouterSetupGuide {
  const custom = product.specs?.["_setupGuide"];
  if (typeof custom === "string" && custom.trim()) {
    return {
      title: `Быстрая настройка: ${product.name}`,
      intro: "Инструкция от производителя для этой модели.",
      steps: custom.split("\n").map((s) => s.trim()).filter(Boolean),
    };
  }

  const brand = resolveBrandKey(product.brand?.name);
  const ctx = productContext(product);
  const ui = BRAND_UI[brand];

  const steps: string[] = [
    ctx.has4g
      ? "Подключите питание. Для LTE-модели при необходимости вставьте SIM, а кабель провайдера (если есть) подключите в WAN / Internet."
      : "Подключите питание и вставьте кабель провайдера в порт WAN / Internet (обычно синий или отдельно подписанный).",
    "Подождите 1–2 минуты, пока индикаторы стабилизируются (обычно загорается Wi‑Fi или Internet).",
    `На ПК или телефоне подключитесь к Wi‑Fi с заводской наклейкой или по кабелю LAN – откройте http://${ui.panel} или ${ui.defaultIp}.`,
    "Создайте пароль администратора панели и запустите мастер «Быстрая настройка» / Quick Setup.",
    connectionStep(ctx, brand),
  ];

  if (ctx.hasMesh) {
    steps.push(
      "Для Mesh-комплекта: основной узел разместите рядом с модемом провайдера, дополнительные включите в розетки в нужных комнатах – дождитесь объединения узлов в одну сеть (обычно 3–5 минут).",
    );
  }

  steps.push(
    ctx.dualBand
      ? "Задайте имя и пароль Wi‑Fi. Рекомендуется одинаковое имя для 2.4 ГГц и 5 ГГц (Band Steering) или два отдельных SSID с пометкой _5G."
      : "Задайте имя сети (SSID) и надёжный пароль Wi‑Fi (не короче 8 символов).",
    "Сохраните настройки, дождитесь перезагрузки. Подключите телефон, ноутбук и ТВ к новой сети.",
    "В панели проверьте раздел «Статус» / Internet: должен быть доступ в интернет. При необходимости обновите прошивку.",
  );

  if (brand === "keenetic") {
    steps.push(
      "В Keenetic: при необходимости включите «Интернет-фильтр» и резервное копирование конфигурации в разделе «Управление».",
    );
  } else if (brand === "tplink") {
    steps.push(
      "В TP-Link: раздел «Advanced» → «System Tools» – сохраните резервную копию настроек после успешного выхода в интернет.",
    );
  } else if (brand === "asus") {
    steps.push(
      "В ASUS: раздел AiProtection можно включить после базовой настройки; для гейминга – Game Boost по желанию.",
    );
  } else if (brand === "xiaomi") {
    steps.push(
      "В Mi WiFi: привяжите роутер к приложению Xiaomi Home для удалённого управления и гостевой сети.",
    );
  } else if (brand === "mikrotik") {
    steps.push(
      "В MikroTik: после Quick Set откройте Winbox для тонкой настройки; не меняйте firewall без необходимости.",
    );
  }

  const tip = ctx.has4g
    ? "Если нет интернета: проверьте источник WAN, APN и баланс SIM, надёжность подключения антенн и статус в разделе Internet."
    : "Если панель не открывается – проверьте, что вы подключены именно к этому роутеру, попробуйте другой браузер или режим инкогнито. В крайнем случае зажмите кнопку Reset на 10 секунд для сброса настроек.";

  return {
    title: `Быстрая настройка: ${product.name}`,
    intro: brandIntro(brand, product),
    steps,
    tip,
  };
}
