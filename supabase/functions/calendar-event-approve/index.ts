import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("PUBLIC_APP_URL") ?? "https://dms.futurelinkconsultants.com";

const Body = z.object({
  event_id: z.string().uuid(),
  meeting_link: z.string().url().max(500),
  remarks: z.string().max(2000).optional().nullable(),
});

function token() {
  const b = new Uint8Array(24); crypto.getRandomValues(b);
  return Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");
}

function whenLabel(date: string, start: string, tz?: string) {
  const d = new Date(`${date}T${start}`);
  return d.toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + (tz ? ` ${tz}` : "");
}

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { event_id, meeting_link, remarks } = parsed.data;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: ev, error: evErr } = await admin
      .from("calendar_events")
      .select("*, calendar_meeting_types(meeting_name,duration_min), calendar_participants(full_name,email)")
      .eq("id", event_id).maybeSingle();
    if (evErr || !ev) return json({ error: "Event not found" }, 404);
    if (ev.user_id !== user.id) {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
      const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
    }

    const fromStatus = ev.status;
    if (!["pending"].includes(fromStatus)) return json({ error: `Cannot approve from status: ${fromStatus}` }, 400);

    const { error: updErr } = await admin.from("calendar_events").update({
      status: "awaiting_requester",
      meeting_link, host_remarks: remarks ?? null,
    }).eq("id", event_id);
    if (updErr) return json({ error: updErr.message }, 500);

    // Issue tokens
    const tConfirm = token(), tResched = token(), tDecline = token();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    await admin.from("calendar_tokens").insert([
      { event_id, token: tConfirm, purpose: "confirm", expires_at: expiresAt },
      { event_id, token: tResched, purpose: "reschedule", expires_at: expiresAt },
      { event_id, token: tDecline, purpose: "decline", expires_at: expiresAt },
    ]);

    await admin.from("calendar_event_audit").insert({
      event_id, from_status: fromStatus, to_status: "awaiting_requester",
      actor_id: user.id, actor_kind: "host", note: remarks ? `Approved. ${remarks}` : "Approved by host",
    });

    // Email visitor
    const visitor = ev.calendar_participants?.[0];
    const mt = ev.calendar_meeting_types;
    if (visitor?.email) {
      const { data: profile } = await admin.from("calendar_profiles").select("display_name").eq("user_id", ev.user_id).maybeSingle();
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "appointment-approved",
          recipientEmail: visitor.email,
          idempotencyKey: `appt-approved-${event_id}`,
          templateData: {
            requesterName: visitor.full_name,
            hostName: profile?.display_name ?? "Your host",
            meetingTitle: mt?.meeting_name ?? ev.event_title ?? "Meeting",
            whenLabel: whenLabel(ev.event_date, ev.start_time, ev.visitor_timezone),
            durationMin: mt?.duration_min,
            meetingLink: meeting_link,
            remarks: remarks ?? undefined,
            confirmUrl: `${APP_URL}/a/${tConfirm}?action=confirm`,
            rescheduleUrl: `${APP_URL}/a/${tResched}?action=reschedule`,
            declineUrl: `${APP_URL}/a/${tDecline}?action=decline`,
          },
        },
      });
      await admin.from("calendar_notifications").insert({
        event_id, notification_type: "approval_sent", recipient_email: visitor.email, delivery_status: "queued",
      });
    }

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});