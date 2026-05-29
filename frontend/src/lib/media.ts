const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const PROXY_HOSTS = ["images.5element.by", "5element.by", "www.5element.by"];

function apiPrefix(): string {
  return API_BASE ? `${API_BASE}/api` : "/api";
}

function needsImageProxy(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return PROXY_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
}

export function resolveMediaUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url?.trim()) return undefined;
  const value = url.trim();
  if (/^https?:\/\//i.test(value)) {
    if (needsImageProxy(value)) {
      return `${apiPrefix()}/media/proxy?url=${encodeURIComponent(value)}`;
    }
    return value;
  }
  if (value.startsWith("/")) return API_BASE ? `${API_BASE}${value}` : value;
  const path = value.startsWith("uploads/") ? `/${value}` : `/uploads/${value}`;
  return API_BASE ? `${API_BASE}${path}` : path;
}
