const DISPLAY_NAME_MAP: Record<string, string> = {
  "Патч-корды (Ethernet)": "Патч-корды",
};

export function categoryDisplayName(name: string | null | undefined): string {
  if (!name) return "";
  return DISPLAY_NAME_MAP[name] ?? name;
}
