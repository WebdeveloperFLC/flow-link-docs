import {
  clearSupabaseSessionStorage,
  hasStoredSupabaseSession,
  isLovablePreview,
} from "@/lib/previewEnv";

const path = window.location.pathname;
const preview = isLovablePreview();

if ((path === "/" || path === "") && preview) {
  clearSupabaseSessionStorage();
  window.location.replace(`/auth${window.location.search}${window.location.hash}`);
} else if ((path === "/" || path === "") && !hasStoredSupabaseSession()) {
  window.location.replace(`/auth${window.location.search}${window.location.hash}`);
} else if (path.startsWith("/auth") || path.startsWith("/reset-password")) {
  void import("./main-auth.tsx");
} else {
  void import("./main.tsx");
}
