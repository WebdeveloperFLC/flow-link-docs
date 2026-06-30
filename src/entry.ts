import {
  hasStoredSupabaseSession,
} from "@/lib/previewEnv";

const path = window.location.pathname;
const hasSession = hasStoredSupabaseSession();

if ((path === "/" || path === "") && !hasSession) {
  window.location.replace(`/auth${window.location.search}${window.location.hash}`);
} else if (path.startsWith("/auth") || path.startsWith("/reset-password")) {
  if (hasSession) {
    void import("./main.tsx");
  } else {
    void import("./main-auth.tsx");
  }
} else {
  void import("./main.tsx");
}
