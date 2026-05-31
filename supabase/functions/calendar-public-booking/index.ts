import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// --- naive per-IP rate limit (best-effort, in-memory) ----------------
const buckets = new Map<string, { count: number; reset: number }>();
const RL_WINDOW_MS = 60_000;
const RL_MAX = 30;
function rateLimit(ip: string) {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.reset < now) {
    buckets.set(ip, { count: 1, reset: now + RL_WINDOW_MS });
    return true;
  }
  if (b.count >= RL_MAX) return false;
  b.count += 1;
  return true;
}

// --- schemas ---------------------------------------------------------
const ResolveSchema = z.object({
  action: z.literal("resolve_profile"),
  slug: z.string().min(1).max(120),
});

const SlotsSchema = z.object({
  action: z.literal("available_slots"),
  slug: z.string().min(1).max(120),
  meeting_type_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const BookingSchema = z.object({
  action: z.literal("create_booking"),
  slug: z.string().min(1).max(120),
  meeting_type_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  visitor: z.object({
    full_name: z.string().trim().min(1).max(150),
    email: z.string().trim().email().max(255),
    mobile_number: z.string().trim().min(5).max(40),
    company_name: z.string().trim().max(150).optional(),
    designation: z.string().trim().max(150).optional(),
  }),
  visitor_timezone: z.string().min(1).max(80),
  purpose: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

const ManageSchema = z.object({
  action: z.literal("manage_event"),
  token: z.string().min(8).max(128),
  intent: z.enum(["view", "cancel"]),
});

const ActionSchema = z.discriminatedUnion("action", [
  ResolveSchema,
  SlotsSchema,
  BookingSchema,
  ManageSchema,
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  if (!rateLimit(ip)) return json({ error: "rate limit exceeded" }, 429);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const parsed = ActionSchema.safeParse(raw);
  if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
  const input = parsed.data;

  try {
    if (input.action === "resolve_profile") {
      const { data, error } = await supabase.rpc("calendar_resolve_profile", { _slug: input.slug });
      if (error) throw error;
      if (!data) return json({ error: "not found" }, 404);
      return json(data);
    }

    if (input.action === "available_slots") {
      const { data, error } = await supabase.rpc("calendar_available_slots", {
        _slug: input.slug,
        _meeting_type_id: input.meeting_type_id,
        _date: input.date,
      });
      if (error) throw error;
      return json({ slots: data ?? [] });
    }

    if (input.action === "create_booking") {
      const { data, error } = await supabase.rpc("calendar_create_booking", {
        _slug: input.slug,
        _meeting_type_id: input.meeting_type_id,
        _date: input.date,
        _start_time: input.start_time,
        _visitor: input.visitor,
        _visitor_timezone: input.visitor_timezone,
        _purpose: input.purpose ?? null,
        _notes: input.notes ?? null,
      });
      if (error) throw error;
      return json(data);
    }

    if (input.action === "manage_event") {
      const { data: eventId, error: tokenErr } = await supabase.rpc("calendar_validate_token", {
        _token: input.token,
      });
      if (tokenErr) throw tokenErr;
      if (!eventId) return json({ error: "invalid or expired token" }, 401);

      if (input.intent === "view") {
        // Limited read via RPC-free path is not exposed; return event_id only.
        return json({ event_id: eventId });
      }
      if (input.intent === "cancel") {
        // Visitor cancellation: use service role would be required to bypass owner RLS.
        // For now we record intent in notifications; host completes the cancel.
        const { error: nErr } = await supabase.from("calendar_notifications").insert({
          event_id: eventId,
          notification_type: "event_cancel_request",
          recipient_email: "host",
          delivery_status: "pending",
        });
        if (nErr) throw nErr;
        return json({ ok: true });
      }
    }

    return json({ error: "unhandled action" }, 400);
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === "string"
        ? e
        : (e as any)?.message ?? JSON.stringify(e);
    return json({ error: msg }, 400);
  }
});