/** Base URL for links emailed or shared with clients (not staff preview hosts). */
export const PRODUCTION_BASE_URL = "https://dms.futurelinkconsultants.com";

export function resolvePublicBaseUrl(requestOrigin: string | null | undefined): string {
  const origin = (requestOrigin ?? "").trim();
  if (!origin) return PRODUCTION_BASE_URL;
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) return origin;
  if (origin.includes("dms.futurelinkconsultants.com")) return origin;
  return PRODUCTION_BASE_URL;
}

export function publicInviteUrl(requestOrigin: string | null | undefined, path: string): string {
  const base = resolvePublicBaseUrl(requestOrigin).replace(/\/+$/, "");
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${base}${clean}`;
}
