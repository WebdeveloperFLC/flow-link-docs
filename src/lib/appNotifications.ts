import { supabase } from "@/integrations/supabase/client";

export type NotificationCategory =
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

/**
 * Fire-and-forget per-user in-app notification insert.
 * Never throws — notification failures must not block business flows.
 */
export async function notifyUsers(input: NotifyInput): Promise<void> {
  try {
    const uniq = Array.from(
      new Set((input.userIds ?? []).filter((u): u is string => !!u))
    );
    if (uniq.length === 0) return;
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
      metadata: input.metadata ?? {},
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
    }
  } catch (e) {
    console.warn("[notif] notify_throw", e);
  }
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