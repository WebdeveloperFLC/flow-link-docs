// Resolves the correct base URL for links that will be SHARED WITH CLIENTS.

export const PRODUCTION_BASE_URL = "https://dms.futurelinkconsultants.com";

const PRODUCTION_HOSTS = new Set<string>([
  "dms.futurelinkconsultants.com",
]);

export function publicBaseUrl(): string {
  if (typeof window === "undefined") return PRODUCTION_BASE_URL;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return window.location.origin;
  }
  if (PRODUCTION_HOSTS.has(host)) {
    return window.location.origin;
  }
  return PRODUCTION_BASE_URL;
}

export function publicUrl(path: string): string {
  const base = publicBaseUrl().replace(/\/+$/, "");
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${base}${clean}`;
}