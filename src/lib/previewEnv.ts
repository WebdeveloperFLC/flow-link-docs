/** True inside Lovable editor preview iframe or *.lovable.app / *.lovable.dev hosts. */
export function isLovablePreview(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (/lovable\.(dev|app)/i.test(window.location.hostname)) return true;
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  return false;
}

export function clearSupabaseSessionStorage(): void {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) localStorage.removeItem(key);
    });
  } catch {
    /* noop */
  }
}

export function hasStoredSupabaseSession(): boolean {
  try {
    return Object.keys(localStorage).some((key) => {
      if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) return false;
      const raw = localStorage.getItem(key);
      return Boolean(raw && raw !== "null" && raw !== "{}");
    });
  } catch {
    return false;
  }
}
