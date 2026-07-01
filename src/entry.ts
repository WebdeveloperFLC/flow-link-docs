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

function bootDebugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
): void {
  const payload = {
    sessionId: "c5260a",
    location,
    message,
    data,
    hypothesisId,
    timestamp: Date.now(),
    runId: "post-fix-v2",
  };
  try {
    const prev = JSON.parse(sessionStorage.getItem("flc-debug-c5260a") || "[]") as unknown[];
    prev.push(payload);
    sessionStorage.setItem("flc-debug-c5260a", JSON.stringify(prev.slice(-80)));
  } catch {
    /* noop */
  }
  fetch("http://127.0.0.1:7861/ingest/bda2c8c0-2fff-4fe0-b6f7-be98b8c0ed66", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c5260a" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

const path = window.location.pathname;
const hasSession = hasStoredSupabaseSession();

bootDebugLog("entry.ts:boot", "entry evaluated", {
  path,
  hasSession,
  hostname: window.location.hostname,
  inIframe: (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })(),
}, "H1");

if ((path === "/" || path === "") && !hasSession) {
  bootDebugLog("entry.ts:redirect", "redirect to /auth", { path }, "H3");
  window.location.replace(`/auth${window.location.search}${window.location.hash}`);
} else if ((path.startsWith("/auth") || path.startsWith("/reset-password")) && !hasSession) {
  bootDebugLog("entry.ts:import", "loading main-auth", { path }, "H3");
  void import("./main-auth.tsx").catch((err: unknown) => {
    bootDebugLog("entry.ts:import", "main-auth failed", {
      path,
      error: err instanceof Error ? err.message : String(err),
    }, "H2");
  });
} else {
  bootDebugLog("entry.ts:import", "loading main", { path }, "H1");
  void import("./main.tsx").catch((err: unknown) => {
    bootDebugLog("entry.ts:import", "main failed", {
      path,
      error: err instanceof Error ? err.message : String(err),
    }, "H2");
  });
}
