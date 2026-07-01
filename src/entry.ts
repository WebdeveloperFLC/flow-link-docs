import {
  hasStoredSupabaseSession,
} from "@/lib/previewEnv";
import { bootDebugLog } from "@/lib/bootDebugLog";

const path = window.location.pathname;
const hasSession = hasStoredSupabaseSession();

bootDebugLog("entry.ts:boot", "entry module evaluated", {
  path,
  hasSession,
  hostname: window.location.hostname,
  inIframe: (() => { try { return window.self !== window.top; } catch { return true; } })(),
}, "H1");

const loadMain = () => {
  bootDebugLog("entry.ts:loadMain", "dynamic import main.tsx started", { path }, "H1");
  void import("./main.tsx")
    .then(() => {
      bootDebugLog("entry.ts:loadMain", "dynamic import main.tsx resolved", { path }, "H1");
    })
    .catch((err: unknown) => {
      bootDebugLog("entry.ts:loadMain", "dynamic import main.tsx failed", {
        path,
        error: err instanceof Error ? err.message : String(err),
      }, "H2");
    });
};

const loadAuth = () => {
  bootDebugLog("entry.ts:loadAuth", "dynamic import main-auth.tsx started", { path }, "H3");
  void import("./main-auth.tsx")
    .then(() => {
      bootDebugLog("entry.ts:loadAuth", "dynamic import main-auth.tsx resolved", { path }, "H3");
    })
    .catch((err: unknown) => {
      bootDebugLog("entry.ts:loadAuth", "dynamic import main-auth.tsx failed", {
        path,
        error: err instanceof Error ? err.message : String(err),
      }, "H2");
    });
};

if ((path === "/" || path === "") && !hasSession) {
  bootDebugLog("entry.ts:redirect", "redirecting unauthenticated user to /auth", { path }, "H3");
  window.location.replace(`/auth${window.location.search}${window.location.hash}`);
} else if (path.startsWith("/auth") || path.startsWith("/reset-password")) {
  if (hasSession) {
    loadMain();
  } else {
    loadAuth();
  }
} else {
  loadMain();
}
