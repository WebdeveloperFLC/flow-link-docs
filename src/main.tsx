import { createRoot } from "react-dom/client";
import { RootErrorBoundary } from "@/components/RootErrorBoundary";
import AppBootstrap from "@/AppBootstrap";
import { resetAppRootLayout } from "@/lib/resetAppRootLayout";
import "./index.css";
import "./styles/performance-hub-theme.css";
import "./hr-payroll/styles/hr-payroll-theme.css";

function showBootstrapError(message: string, stack?: string) {
  // Never set root.innerHTML while React is mounted — that races portal teardown and
  // surfaces a misleading removeChild error (FIN-R-001 / H-F).
  console.error("[bootstrap]", message, stack ?? "");
  let overlay = document.getElementById("bootstrap-error-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "bootstrap-error-overlay";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(255,255,255,0.97);font-family:system-ui,sans-serif";
    document.body.appendChild(overlay);
  }
  const stackBlock = stack
    ? `<pre style="white-space:pre-wrap;background:#f4f4f5;padding:12px;border-radius:8px;font-size:11px;margin-top:8px;max-height:200px;overflow:auto">${stack.replace(/</g, "&lt;")}</pre>`
    : "";
  overlay.innerHTML = `<div style="max-width:560px"><h1 style="font-size:18px;margin:0 0 8px">App failed to start</h1><p style="color:#666;margin:0 0 12px">Hard refresh, then Publish again in Lovable. Share this message if it persists:</p><pre style="white-space:pre-wrap;background:#f4f4f5;padding:12px;border-radius:8px;font-size:12px">${message.replace(/</g, "&lt;")}</pre>${stackBlock}</div>`;
}

// #region agent log
function debugLog(location: string, message: string, data: Record<string, unknown>, hypothesisId: string) {
  fetch("http://127.0.0.1:7932/ingest/ad076abe-09dd-4c51-8767-b401ca5b20d4", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f92c68" },
    body: JSON.stringify({ sessionId: "f92c68", location, message, data, hypothesisId, timestamp: Date.now(), runId: "post-fix-2" }),
  }).catch(() => {});
  console.error(`[ph-debug ${hypothesisId}]`, location, message, data);
}
// #endregion

window.addEventListener("error", (event) => {
  const stack = event.error instanceof Error ? event.error.stack : undefined;
  // #region agent log
  debugLog("main.tsx:error", "window error", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: stack?.slice(0, 800),
  }, "H-F");
  // #endregion
  if (event.message) showBootstrapError(event.message, stack);
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason ?? "Unknown error");
  const stack = reason instanceof Error ? reason.stack : undefined;
  // #region agent log
  debugLog("main.tsx:rejection", "unhandled rejection", {
    message,
    stack: stack?.slice(0, 800),
  }, "H-F");
  // #endregion
  showBootstrapError(message, stack);
});

const mount = document.getElementById("root");
if (!mount) {
  throw new Error("Missing #root element");
}

resetAppRootLayout();

try {
  createRoot(mount).render(
    <RootErrorBoundary>
      <AppBootstrap />
    </RootErrorBoundary>,
  );
} catch (error) {
  showBootstrapError(error instanceof Error ? error.message : String(error));
}
