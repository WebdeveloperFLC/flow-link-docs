// DEV-only tooling: debug toggle, sandbox mode, verbose tracing,
// test notification generator, reconnect simulator. Safe in production (no-ops when off).
import { supabase } from "@/integrations/supabase/client";
import { emitNotification } from "./eventBus";

const KEYS = {
  debug: "notif:dev:debug",
  sandbox: "notif:dev:sandbox",
  verbose: "notif:dev:verbose",
};

function read(k: string) { try { return localStorage.getItem(k) === "1"; } catch { return false; } }
function write(k: string, v: boolean) { try { localStorage.setItem(k, v ? "1" : "0"); } catch {} }

export const isDebugMode   = () => read(KEYS.debug);
export const isSandboxMode = () => read(KEYS.sandbox);
export const isVerbose     = () => read(KEYS.verbose);

export const setDebugMode   = (v: boolean) => write(KEYS.debug, v);
export const setSandboxMode = (v: boolean) => write(KEYS.sandbox, v);
export const setVerbose     = (v: boolean) => write(KEYS.verbose, v);

export function traceEvent(label: string, payload?: unknown) {
  if (isVerbose() || isDebugMode()) console.info(`[notif:trace] ${label}`, payload ?? "");
}

/** Spawn a test notification to the current user (sandbox respected). */
export async function sendTestNotification(severity: "info" | "warning" | "success" | "critical" = "info") {
  const { data } = await supabase.auth.getUser();
  const uid = data?.user?.id;
  if (!uid) return;
  emitNotification("info", {
    userIds: [uid],
    title: `Test notification (${severity})`,
    body: `Generated at ${new Date().toLocaleTimeString()}`,
    link: "/dashboard",
    dedupeKey: `test:${Date.now()}`,
  }, { severity });
}

/** Force-drop and re-subscribe all realtime channels (simulates a reconnect). */
export function simulateReconnect() {
  try {
    const chans = (supabase as any).getChannels?.() ?? [];
    for (const c of chans) supabase.removeChannel(c);
    console.info("[notif:devtools] simulated_reconnect", { dropped: chans.length });
  } catch (e) {
    console.warn("[notif:devtools] simulate_reconnect_failed", e);
  }
}

/** Expose under window for ad-hoc dev console access. */
if (typeof window !== "undefined" && import.meta.env.DEV) {
  (window as any).__notif = {
    setDebugMode, setSandboxMode, setVerbose,
    sendTestNotification, simulateReconnect,
    isDebugMode, isSandboxMode, isVerbose,
  };
}