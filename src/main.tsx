import { createRoot } from "react-dom/client";
import { RootErrorBoundary } from "@/components/RootErrorBoundary";
import AppBootstrap from "@/AppBootstrap";
import "./index.css";
import "./styles/performance-hub-theme.css";
import "./hr-payroll/styles/hr-payroll-theme.css";

function showBootstrapError(message: string) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif"><div style="max-width:560px"><h1 style="font-size:18px;margin:0 0 8px">App failed to start</h1><p style="color:#666;margin:0 0 12px">Hard refresh, then Publish again in Lovable. Share this message if it persists:</p><pre style="white-space:pre-wrap;background:#f4f4f5;padding:12px;border-radius:8px;font-size:12px">${message}</pre></div></div>`;
}

window.addEventListener("error", (event) => {
  if (event.message) showBootstrapError(event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason ?? "Unknown error");
  showBootstrapError(message);
});

const mount = document.getElementById("root");
if (!mount) {
  throw new Error("Missing #root element");
}

try {
  createRoot(mount).render(
    <RootErrorBoundary>
      <AppBootstrap />
    </RootErrorBoundary>,
  );
} catch (error) {
  showBootstrapError(error instanceof Error ? error.message : String(error));
}
