// Single producer entry point: emitNotification(eventType, payload).
// Routes through the template registry → queue → app_notifications.
// All existing `notifyUsers` callers continue to work unchanged.
import { NOTIFICATION_TEMPLATES, type NotificationEventType } from "./templates";
import { enqueueNotifications } from "./queue";
import { isSandboxMode, traceEvent } from "./devtools";

export interface EmitPayload {
  /** target user ids — required */
  userIds: (string | null | undefined)[];
  /** template params */
  [key: string]: any;
}

export interface EmitOptions {
  /** override category (rare) */
  category?: string;
  /** override severity */
  severity?: string;
  /** force dedupe key */
  dedupeKey?: string;
  /** extra metadata for audit */
  metadata?: Record<string, unknown>;
  /** entity hint for audit */
  entityType?: string;
  entityId?: string;
}

export function emitNotification(
  eventType: NotificationEventType,
  payload: EmitPayload,
  opts: EmitOptions = {},
): void {
  try {
    const tmpl = NOTIFICATION_TEMPLATES[eventType];
    if (!tmpl) { console.warn("[event-bus] unknown event", eventType); return; }

    const uniq = Array.from(new Set((payload.userIds ?? []).filter((u): u is string => !!u)));
    if (uniq.length === 0) return;

    const title = tmpl.title(payload);
    const body = tmpl.body?.(payload) ?? null;
    const link = tmpl.link?.(payload) ?? null;
    const dedupe = opts.dedupeKey ?? tmpl.dedupe?.(payload) ?? null;
    const category = opts.category ?? tmpl.category;
    const severity = opts.severity ?? tmpl.severity;

    traceEvent("emit", { eventType, recipients: uniq.length, dedupe });

    if (isSandboxMode()) {
      console.info("[event-bus] SANDBOX (not persisted)", { eventType, title, body, link, recipients: uniq.length });
      return;
    }

    const rows = uniq.map((uid) => ({
      user_id: uid,
      category,
      severity,
      title,
      body,
      link,
      entity_type: opts.entityType ?? null,
      entity_id: opts.entityId ?? null,
      dedupe_key: dedupe ? `${uid}:${dedupe}` : null,
      metadata: { event_type: eventType, ...(opts.metadata ?? {}) },
    }));
    enqueueNotifications(rows);
  } catch (e) {
    console.warn("[event-bus] emit_throw", e);
  }
}

/** Re-export so consumers have one import. */
export type { NotificationEventType } from "./templates";