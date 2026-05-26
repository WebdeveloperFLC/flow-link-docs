// Burst throttling, duplicate suppression, retry backoff, batched inserts.
// In-memory only — survives within a session. Server-side dedupe via app_notifications.dedupe_key still authoritative.
import { supabase } from "@/integrations/supabase/client";

interface QueuedRow {
  user_id: string;
  category: string;
  severity: string;
  title: string;
  body: string | null;
  link: string | null;
  entity_type: string | null;
  entity_id: string | null;
  dedupe_key: string | null;
  metadata: Record<string, unknown>;
}

const DUP_WINDOW_MS = 30_000;
const BURST_LIMIT = 50;            // max sends per BURST_WINDOW
const BURST_WINDOW_MS = 10_000;
const FLUSH_AFTER_MS = 250;        // micro-batch window
const MAX_QUEUE = 1_000;           // overflow protection
const MAX_RETRIES = 3;

const recentKeys = new Map<string, number>(); // dedupe_key -> ts
const burstStamps: number[] = [];
let buffer: QueuedRow[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;
let droppedCount = 0;

function pruneRecent() {
  const now = Date.now();
  for (const [k, t] of recentKeys) if (now - t > DUP_WINDOW_MS) recentKeys.delete(k);
}
function burstAllow(): boolean {
  const now = Date.now();
  while (burstStamps.length && now - burstStamps[0] > BURST_WINDOW_MS) burstStamps.shift();
  if (burstStamps.length >= BURST_LIMIT) return false;
  burstStamps.push(now);
  return true;
}

export function enqueueNotifications(rows: QueuedRow[]) {
  pruneRecent();
  for (const r of rows) {
    // dup suppression (session-local)
    if (r.dedupe_key && recentKeys.has(r.dedupe_key)) {
      console.info("[notif-queue] duplicate_suppressed", r.dedupe_key);
      continue;
    }
    if (r.dedupe_key) recentKeys.set(r.dedupe_key, Date.now());
    if (!burstAllow()) {
      console.warn("[notif-queue] burst_throttled, dropping");
      droppedCount++;
      continue;
    }
    if (buffer.length >= MAX_QUEUE) {
      droppedCount++;
      console.warn("[notif-queue] overflow, dropping oldest");
      buffer.shift();
    }
    buffer.push(r);
  }
  if (!flushTimer) flushTimer = setTimeout(() => void flush(), FLUSH_AFTER_MS);
}

async function flush(attempt = 0): Promise<void> {
  if (inFlight) return;
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  const batch = buffer.splice(0, buffer.length);
  if (!batch.length) return;
  inFlight = true;
  try {
    const { error } = await supabase
      .from("app_notifications")
      .upsert(batch as never, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
    if (error) throw error;
    console.info("[notif-queue] flushed", { count: batch.length });
  } catch (e) {
    console.warn("[notif-queue] flush failed", (e as Error).message);
    if (attempt < MAX_RETRIES) {
      const backoff = Math.min(8_000, 500 * Math.pow(2, attempt));
      setTimeout(() => { buffer.unshift(...batch); inFlight = false; void flush(attempt + 1); }, backoff);
      return;
    }
    // dead-letter
    console.error("[notif-queue] dead_letter", { count: batch.length });
  } finally {
    inFlight = false;
    if (buffer.length) flushTimer = setTimeout(() => void flush(), FLUSH_AFTER_MS);
  }
}

export function getQueueStats() {
  return { buffered: buffer.length, recentKeys: recentKeys.size, droppedCount, inFlight };
}