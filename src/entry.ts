import "./index.css";

function hasStoredSupabaseSession(): boolean {
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

const path = window.location.pathname;
const hasSession = hasStoredSupabaseSession();

if ((path === "/" || path === "") && !hasSession) {
  window.location.replace(`/auth${window.location.search}${window.location.hash}`);
} else if ((path.startsWith("/auth") || path.startsWith("/reset-password")) && !hasSession) {
  void import("./main-auth.tsx");
} else {
  void import("./main.tsx");
}
