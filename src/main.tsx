import { createRoot } from "react-dom/client";
import { RootErrorBoundary } from "@/components/RootErrorBoundary";
import AppBootstrap from "@/AppBootstrap";
import { resetAppRootLayout } from "@/lib/resetAppRootLayout";
import { deferModuleStyles } from "@/lib/deferModuleStyles";
import "./index.css";

function showBootstrapError(message: string, stack?: string) {
  // Never set root.innerHTML while React is mounted — that races portal teardown and
  // surfaces a misleading removeChild error (FIN-R-001).
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

window.addEventListener("error", (event) => {
  const stack = event.error instanceof Error ? event.error.stack : undefined;
  if (event.message) showBootstrapError(event.message, stack);
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason ?? "Unknown error");
  const stack = reason instanceof Error ? reason.stack : undefined;
  showBootstrapError(message, stack);
});

const mount = document.getElementById("root");
if (!mount) {
  throw new Error("Missing #root element");
}

resetAppRootLayout();
deferModuleStyles();

try {
  createRoot(mount).render(
    <RootErrorBoundary>
      <AppBootstrap />
    </RootErrorBoundary>,
  );
} catch (error) {
  showBootstrapError(error instanceof Error ? error.message : String(error));
}
