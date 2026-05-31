import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const Body = z.object({
  event_id: z.string().uuid(),
  reason: z.string().max(2000).optional().nullable(),
});

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function whenLabel(date: string, start: string, tz?: string) {
  const d = new Date(`${date}T${start}`);
  return d.toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + (tz ? ` ${tz}` : "");
}

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
    const { event_id, reason } = parsed.data;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: ev } = await admin
      .from("calendar_events")
      .select("*, calendar_meeting_types(meeting_name), calendar_participants(full_name,email)")
      .eq("id", event_id).maybeSingle();
    if (!ev) return json({ error: "Event not found" }, 404);
    if (ev.user_id !== user.id) {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
      const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
    }

    const fromStatus = ev.status;
    await admin.from("calendar_events").update({
      status: "declined",
      cancellation_reason: reason ?? "Declined by host",
      host_remarks: reason ?? null,
    }).eq("id", event_id);

    await admin.from("calendar_slot_reservations").update({ released: true }).eq("event_id", event_id);

    await admin.from("calendar_event_audit").insert({
      event_id, from_status: fromStatus, to_status: "declined",
      actor_id: user.id, actor_kind: "host", note: reason ?? "Declined by host",
    });

    const visitor = ev.calendar_participants?.[0];
    if (visitor?.email) {
      const { data: profile } = await admin.from("calendar_profiles").select("full_name").eq("user_id", ev.user_id).maybeSingle();
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "appointment-declined",
          recipientEmail: visitor.email,
          idempotencyKey: `appt-declined-${event_id}`,
          templateData: {
            requesterName: visitor.full_name,
            hostName: profile?.full_name ?? "Your host",
            meetingTitle: ev.calendar_meeting_types?.meeting_name ?? ev.event_title ?? "Meeting",
            whenLabel: whenLabel(ev.event_date, ev.start_time, ev.visitor_timezone),
            reason: reason ?? undefined,
          },
        },
      });
      await admin.from("calendar_notifications").insert({
        event_id, notification_type: "declined_sent", recipient_email: visitor.email, delivery_status: "queued",
      });
    }

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});