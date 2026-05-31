import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("PUBLIC_APP_URL") ?? "https://dms.futurelinkconsultants.com";

const Body = z.object({
  event_id: z.string().uuid(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  meeting_link: z.string().url().max(500).optional(),
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
    const { event_id, event_date, start_time, end_time, meeting_link } = parsed.data;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: ev } = await admin
      .from("calendar_events")
      .select("*, calendar_meeting_types(meeting_name,duration_min), calendar_participants(full_name,email)")
      .eq("id", event_id).maybeSingle();
    if (!ev) return json({ error: "Event not found" }, 404);
    if (ev.user_id !== user.id) {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
      const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
    }

    const oldWhen = whenLabel(ev.event_date, ev.start_time, ev.visitor_timezone);
    const fromStatus = ev.status;

    const update: any = {
      status: "rescheduled_awaiting",
      event_date, start_time, end_time,
      reschedule_proposed_date: null, reschedule_proposed_start: null, reschedule_proposed_end: null,
    };
    if (meeting_link) update.meeting_link = meeting_link;
    await admin.from("calendar_events").update(update).eq("id", event_id);

    // Invalidate old tokens, issue new ones
    await admin.from("calendar_tokens").update({ used_at: new Date().toISOString() })
      .eq("event_id", event_id).is("used_at", null);
    const tConfirm = token(), tResched = token(), tDecline = token();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    await admin.from("calendar_tokens").insert([
      { event_id, token: tConfirm, purpose: "confirm", expires_at: expiresAt },
      { event_id, token: tResched, purpose: "reschedule", expires_at: expiresAt },
      { event_id, token: tDecline, purpose: "decline", expires_at: expiresAt },
    ]);

    await admin.from("calendar_event_audit").insert({
      event_id, from_status: fromStatus, to_status: "rescheduled_awaiting",
      actor_id: user.id, actor_kind: "host", note: `Rescheduled to ${event_date} ${start_time}`,
    });

    const visitor = ev.calendar_participants?.[0];
    if (visitor?.email) {
      const { data: profile } = await admin.from("calendar_profiles").select("full_name").eq("user_id", ev.user_id).maybeSingle();
      const mt = ev.calendar_meeting_types;
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "appointment-reschedule-proposed",
          recipientEmail: visitor.email,
          idempotencyKey: `appt-resched-${event_id}-${event_date}-${start_time}`,
          templateData: {
            requesterName: visitor.full_name,
            hostName: profile?.full_name ?? "Your host",
            meetingTitle: mt?.meeting_name ?? ev.event_title ?? "Meeting",
            oldWhenLabel: oldWhen,
            newWhenLabel: whenLabel(event_date, start_time, ev.visitor_timezone),
            durationMin: mt?.duration_min,
            meetingLink: meeting_link ?? ev.meeting_link,
            confirmUrl: `${APP_URL}/a/${tConfirm}?action=confirm`,
            rescheduleUrl: `${APP_URL}/a/${tResched}?action=reschedule`,
            declineUrl: `${APP_URL}/a/${tDecline}?action=decline`,
          },
        },
      });
      await admin.from("calendar_notifications").insert({
        event_id, notification_type: "reschedule_sent", recipient_email: visitor.email, delivery_status: "queued",
      });
    }

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});