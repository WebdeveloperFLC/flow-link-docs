/**
 * Browser Notifications API helpers (no service worker — Lovable PWA-safe).
 * Notifications only fire while the tab is alive; this is intentional and
 * sufficient for an enterprise CRM that the user keeps open. No push server,
 * no SW registration, no VAPID — zero infra impact.
 */

const PERMISSION_PROMPTED_KEY = "notif:push_prompted";
const PUSH_ENABLED_KEY = "notif:push_enabled";
const PUSH_CATEGORIES = new Set([
  "urgent_review_required",
  "new_task_assigned",
  "portal_message",
  "payment_verified",
]);

const recentPushIds = new Set<string>();

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

export function isPushEnabled(): boolean {
  if (!isPushSupported()) return false;
  if (Notification.permission !== "granted") return false;
  try {
    return localStorage.getItem(PUSH_ENABLED_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setPushEnabled(on: boolean) {
  try {
    localStorage.setItem(PUSH_ENABLED_KEY, on ? "1" : "0");
  } catch {}
}

export function wasPromptedBefore(): boolean {
  try {
    return localStorage.getItem(PERMISSION_PROMPTED_KEY) === "1";
  } catch {
    return false;
  }
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return "denied";
  try {
    localStorage.setItem(PERMISSION_PROMPTED_KEY, "1");
  } catch {}
  try {
    const result = await Notification.requestPermission();
    console.info("[notif] push_permission_result", result);
    if (result === "granted") setPushEnabled(true);
    return result;
  } catch (e) {
    console.warn("[notif] push_permission_throw", e);
    return "denied";
  }
}

export function shouldPushFor(category: string): boolean {
  return PUSH_CATEGORIES.has(category);
}

export interface PushPayload {
  id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  category: string;
  severity?: string;
}

/**
 * Fire a browser notification when tab is hidden/unfocused.
 * Safe to call always — dedupes, respects permission + enabled + category.
 */
export function maybeShowBrowserPush(p: PushPayload) {
  try {
    if (!isPushEnabled()) {
      console.info("[notif] push_skipped", { reason: "disabled_or_denied" });
      return;
    }
    if (!shouldPushFor(p.category)) {
      console.info("[notif] push_skipped", { reason: "category_not_eligible", category: p.category });
      return;
    }
    // Only push if tab is hidden — avoid double-notifying alongside the in-app toast
    if (typeof document !== "undefined" && document.visibilityState === "visible" && document.hasFocus()) {
      console.info("[notif] push_skipped", { reason: "tab_focused" });
      return;
    }
    if (recentPushIds.has(p.id)) {
      console.info("[notif] duplicate_push_blocked", { id: p.id });
      return;
    }
    recentPushIds.add(p.id);
    if (recentPushIds.size > 200) {
      const arr = Array.from(recentPushIds);
      recentPushIds.clear();
      arr.slice(-100).forEach((v) => recentPushIds.add(v));
    }

    const n = new Notification(p.title, {
      body: p.body ?? undefined,
      tag: p.id, // OS-level dedupe
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      requireInteraction: p.severity === "critical",
    });
    n.onclick = () => {
      try {
        window.focus();
        if (p.link) window.location.href = p.link;
        n.close();
        console.info("[notif] push_clicked", { id: p.id, link: p.link });
      } catch {}
    };
    console.info("[notif] push_shown", { id: p.id, category: p.category });
  } catch (e) {
    console.warn("[notif] push_throw", e);
  }
}