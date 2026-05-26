import { supabase } from "@/integrations/supabase/client";

export type NotificationCategory =
  | "invoice_created"
  | "payment_received"
  | "payment_verified"
  | "receipt_generated"
  | "new_task_assigned"
  | "client_assigned"
  | "document_uploaded"
  | "portal_invite_sent"
  | "lead_converted"
  | "urgent_review_required"
  | "portal_message"
  | "info";

export type NotificationSeverity = "info" | "success" | "warning" | "critical";

export interface NotifyInput {
  userIds: (string | null | undefined)[];
  category: NotificationCategory;
  title: string;
  body?: string | null;
  link?: string | null;
  severity?: NotificationSeverity;
  entityType?: string | null;
  entityId?: string | null;
  dedupeKey?: string | null;
  metadata?: Record<string, unknown>;
}

export function resolveCounselorNotificationUserIds(
  client: { assigned_counselor_id?: string | null; owner_id?: string | null } | null | undefined,
  context?: Record<string, unknown>,
): string[] {
  const resolved = client?.assigned_counselor_id ?? client?.owner_id ?? null;
  const source = client?.assigned_counselor_id ? "assigned_counselor_id" : client?.owner_id ? "owner_id" : null;
  console.info("[notif-debug] resolved_user_ids", {
    ...context,
    assigned_counselor_id: client?.assigned_counselor_id ?? null,
    owner_id: client?.owner_id ?? null,
    resolved_user_ids: resolved ? [resolved] : [],
    source,
  });
  return resolved ? [resolved] : [];
}

/**
 * Fire-and-forget per-user in-app notification insert.
 * Never throws — notification failures must not block business flows.
 */
export async function notifyUsers(input: NotifyInput): Promise<void> {
  try {
    console.info("[notif-debug] producer_called", {
      category: input.category,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      rawUserIds: input.userIds ?? [],
      dedupeKey: input.dedupeKey ?? null,
    });
    const uniq = Array.from(
      new Set((input.userIds ?? []).filter((u): u is string => !!u))
    );
    if (uniq.length === 0) {
      console.warn("[notif-debug] filtered_out_reason", {
        category: input.category,
        reason: "no_recipient_user_ids",
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      });
      return;
    }
    const rows = uniq.map((uid) => ({
      user_id: uid,
      category: input.category,
      severity: input.severity ?? "info",
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      dedupe_key: input.dedupeKey ? `${uid}:${input.dedupeKey}` : null,
      metadata: (input.metadata ?? {}) as any,
    }));
    console.info("[notif] notification_created", {
      category: input.category,
      recipients: uniq.length,
      dedupe: !!input.dedupeKey,
    });
    const { error } = await supabase
      .from("app_notifications")
      .upsert(rows, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
    if (error) {
      // Unique-violation on dedupe is expected & safe → log only
      console.info("[notif] duplicate_notification_blocked_or_error", error.message);
      console.warn("[notif-debug] filtered_out_reason", {
        category: input.category,
        reason: "insert_error",
        error: error.message,
        userIds: uniq,
      });
    } else {
      console.info("[notif-debug] app_notification_inserted", {
        category: input.category,
        requestedUserIds: uniq,
        insertedCount: rows.length,
        rows: rows.map((r) => ({
          user_id: r.user_id,
          category: r.category,
          entity_type: r.entity_type,
          entity_id: r.entity_id,
          dedupe_key: r.dedupe_key,
        })),
      });
    }
  } catch (e) {
    console.warn("[notif] notify_throw", e);
  }
}

async function notifTest() {
  const { data } = await supabase.auth.getUser();
  const uid = data?.user?.id;
  if (!uid) {
    console.warn("[notif-debug] filtered_out_reason", { reason: "manual_test_no_logged_in_user" });
    return { ok: false, reason: "no_logged_in_user" };
  }
  await notifyUsers({
    userIds: [uid],
    category: "info",
    severity: "info",
    title: "Realtime notification test",
    body: "Manual test inserted for the current user.",
    link: "/dashboard",
    entityType: "notification_test",
    entityId: null,
    dedupeKey: `manual-test:${Date.now()}`,
    metadata: { manual_test: true },
  });
  return { ok: true, user_id: uid };
}

if (typeof window !== "undefined") {
  (window as any).__notifTest = notifTest;
}

/* ─────────────  Sound  ───────────── */

const SOUND_CATEGORIES: ReadonlySet<NotificationCategory> = new Set([
  "payment_verified",
  "new_task_assigned",
  "client_assigned",
  "portal_message",
  "urgent_review_required",
]);

let lastSoundAt = 0;
const recentSoundIds = new Set<string>();
let audioCtx: AudioContext | null = null;

export function shouldPlaySoundFor(category: string): boolean {
  return SOUND_CATEGORIES.has(category as NotificationCategory);
}

export function playNotificationChime(notifId?: string) {
  try {
    if (notifId) {
      if (recentSoundIds.has(notifId)) {
        console.info("[notif] duplicate_sound_blocked", { notifId });
        return;
      }
      recentSoundIds.add(notifId);
      if (recentSoundIds.size > 200) {
        const arr = Array.from(recentSoundIds);
        recentSoundIds.clear();
        arr.slice(-100).forEach((v) => recentSoundIds.add(v));
      }
    }
    const now = Date.now();
    if (now - lastSoundAt < 600) {
      console.info("[notif] sound_skipped", { reason: "debounce" });
      return;
    }
    lastSoundAt = now;

    const Ctx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (!audioCtx) return;
    const ctx = audioCtx;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const playTone = (freq: number, start: number, dur: number, gain = 0.08) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.01);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.02);
    };
    playTone(880, 0, 0.18);
    playTone(1320, 0.12, 0.22);
    console.info("[notif] sound_played");
  } catch (e) {
    console.warn("[notif] sound_throw", e);
  }
}