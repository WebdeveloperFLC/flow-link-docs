// Digest engine - runs hourly via pg_cron, picks users whose local "morning" is now.
// Idempotent via notification_digest_log (one row per user per period+day).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
}

function localHour(tz: string): { hour: number; dow: number; dayKey: string } {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit" });
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
    const hour = Number(parts.hour ?? "0");
    const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dow = dowMap[parts.weekday as string] ?? 0;
    const dayKey = `${parts.year}-${parts.month}-${parts.day}`;
    return { hour, dow, dayKey };
  } catch {
    const d = new Date();
    return { hour: d.getUTCHours(), dow: d.getUTCDay(), dayKey: d.toISOString().slice(0, 10) };
  }
}

async function buildSummary(sb: ReturnType<typeof admin>, userId: string) {
  // pending tasks for user
  const { count: pendingTasks } = await sb.from("client_tasks").select("id", { count: "exact", head: true })
    .eq("assigned_to", userId).in("status", ["open", "in_progress"]);
  const { count: unreadNotif } = await sb.from("app_notifications").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("is_read", false);
  const { count: urgentItems } = await sb.from("app_notifications").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("category", "urgent_review_required").eq("is_read", false);
  return {
    pending_tasks: pendingTasks ?? 0,
    unread_notifications: unreadNotif ?? 0,
    urgent_items: urgentItems ?? 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const incoming = req.headers.get("x-cron-secret") ?? "";
    const auth = req.headers.get("Authorization") ?? "";
    const serviceRoleOk = auth === `Bearer ${SERVICE_ROLE}`;
    if (incoming !== cronSecret && !serviceRoleOk) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }
  const sb = admin();
  const result = { ok: true, sent_daily: 0, sent_weekly: 0, considered: 0 };
  try {
    const { data: prefs } = await sb.from("user_notification_prefs")
      .select("user_id,digest_frequency,timezone")
      .in("digest_frequency", ["daily", "weekly"]);
    if (!prefs?.length) return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    for (const p of prefs as any[]) {
      result.considered++;
      const tz = p.timezone || "Asia/Kolkata";
      const { hour, dow, dayKey } = localHour(tz);
      // 8am local. Weekly on Monday.
      if (hour !== 8) continue;
      if (p.digest_frequency === "weekly" && dow !== 1) continue;

      // dedupe per day
      const { data: prev } = await sb.from("notification_digest_log")
        .select("id").eq("user_id", p.user_id).eq("period", p.digest_frequency)
        .gte("sent_at", new Date(new Date().toISOString().slice(0, 10)).toISOString())
        .maybeSingle();
      if (prev) continue;

      const summary = await buildSummary(sb, p.user_id);
      const title = p.digest_frequency === "daily" ? "Your daily digest" : "Your weekly digest";
      const body = `${summary.pending_tasks} pending task(s), ${summary.unread_notifications} unread notification(s), ${summary.urgent_items} urgent item(s).`;
      await sb.from("app_notifications").upsert({
        user_id: p.user_id,
        category: "info",
        severity: "info",
        title,
        body,
        link: "/dashboard",
        dedupe_key: `${p.user_id}:digest:${p.digest_frequency}:${dayKey}`,
        metadata: summary as never,
      }, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
      await sb.from("notification_digest_log").insert({
        user_id: p.user_id,
        period: p.digest_frequency,
        summary: summary as never,
      });
      await sb.from("notification_delivery_log").insert({
        user_id: p.user_id, category: "info", channel: "digest", status: "sent", metadata: summary as never,
      });
      if (p.digest_frequency === "daily") result.sent_daily++; else result.sent_weekly++;
    }
    console.info("[digest] tick", result);
  } catch (e) {
    console.error("[digest] error", e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
  return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});