import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const Body = z.object({
  token: z.string().min(16).max(128),
  action: z.enum(["confirm", "decline", "reschedule"]),
  reason: z.string().max(2000).optional(),
});

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ACTION_STATUS: Record<string, string> = {
  confirm: "confirmed",
  decline: "declined_by_requester",
  reschedule: "reschedule_requested",
};

const HOST_ACTION_LABEL: Record<string, "confirmed" | "declined" | "reschedule_requested"> = {
  confirm: "confirmed",
  decline: "declined",
  reschedule: "reschedule_requested",
};

function whenLabel(date: string, start: string, tz?: string) {
  const d = new Date(`${date}T${start}`);
  return d.toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + (tz ? ` ${tz}` : "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { token, action, reason } = parsed.data;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: tok } = await admin.from("calendar_tokens")
      .select("*").eq("token", token).maybeSingle();
    if (!tok) return json({ error: "Invalid link" }, 404);
    if (tok.purpose !== action) return json({ error: "Token does not match action" }, 400);
    if (tok.used_at) return json({ error: "This link has already been used", already_used: true }, 410);
    if (new Date(tok.expires_at) < new Date()) return json({ error: "Link expired" }, 410);

    const { data: ev } = await admin
      .from("calendar_events")
      .select("*, calendar_meeting_types(meeting_name), calendar_participants(full_name,email)")
      .eq("id", tok.event_id).maybeSingle();
    if (!ev) return json({ error: "Event not found" }, 404);
    if (!["awaiting_requester", "rescheduled_awaiting"].includes(ev.status)) {
      return json({ error: `Event is not awaiting confirmation (status: ${ev.status})` }, 409);
    }

    const newStatus = ACTION_STATUS[action];
    const fromStatus = ev.status;

    // Mark all sibling tokens for this event as used (single-use trio)
    await admin.from("calendar_tokens").update({ used_at: new Date().toISOString() })
      .eq("event_id", tok.event_id).is("used_at", null);

    await admin.from("calendar_events").update({
      status: newStatus,
      requester_response_at: new Date().toISOString(),
      reschedule_reason: action === "reschedule" ? (reason ?? null) : ev.reschedule_reason,
      cancellation_reason: action === "decline" ? (reason ?? "Declined by requester") : ev.cancellation_reason,
    }).eq("id", tok.event_id);

    if (action === "decline") {
      await admin.from("calendar_slot_reservations").update({ released: true }).eq("event_id", tok.event_id);
    }

    await admin.from("calendar_event_audit").insert({
      event_id: tok.event_id, from_status: fromStatus, to_status: newStatus,
      actor_id: null, actor_kind: "requester",
      note: reason ?? (action === "confirm" ? "Confirmed attendance" : action === "decline" ? "Declined meeting" : "Requested reschedule"),
    });

    // Notify host (in-app + email)
    const { data: hostUser } = await admin.auth.admin.getUserById(ev.user_id);
    const hostEmail = hostUser?.user?.email;
    const { data: profile } = await admin.from("calendar_profiles").select("full_name").eq("user_id", ev.user_id).maybeSingle();
    const visitor = ev.calendar_participants?.[0];

    if (hostEmail) {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "appointment-host-notification",
          recipientEmail: hostEmail,
          idempotencyKey: `host-notif-${tok.event_id}-${action}-${tok.id}`,
          templateData: {
            hostName: profile?.full_name,
            requesterName: visitor?.full_name,
            requesterEmail: visitor?.email,
            meetingTitle: ev.calendar_meeting_types?.meeting_name ?? ev.event_title ?? "Meeting",
            whenLabel: whenLabel(ev.event_date, ev.start_time, ev.host_timezone),
            action: HOST_ACTION_LABEL[action],
            reason: reason ?? undefined,
          },
        },
      });
    }
    await admin.from("calendar_notifications").insert({
      event_id: tok.event_id, notification_type: `requester_${action}`,
      recipient_email: hostEmail ?? "host", delivery_status: "queued",
    });

    return json({ ok: true, status: newStatus });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});