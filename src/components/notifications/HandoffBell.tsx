/**
 * HandoffBell — RETIRED
 *
 * Handoff notifications are now delivered through the enterprise
 * in-app notification system (app_notifications + NotificationCenter).
 * When `pushHandoff()` is called in src/lib/handoffs.ts it fires
 * `notifyUsers({ category: "client_assigned", ... })` which appears
 * in the NotificationCenter bell in the Topbar.
 *
 * This file is kept as a no-op export so existing imports don't need
 * to be removed in a separate pass. Delete this file and its callers
 * once you've confirmed no stale imports remain.
 *
 * @deprecated Use NotificationCenter (category "client_assigned") instead.
 */
export function HandoffBell() {
  return null;
}
