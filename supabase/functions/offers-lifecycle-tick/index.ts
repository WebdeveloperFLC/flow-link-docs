// ============================================================
// offers-lifecycle-tick
// Daily cron worker — birthday offers + campaign calendar activation.
//
// For each client whose date_of_birth is set and whose birthday is
// exactly N days ahead (default 7), generate a concrete offer from each
// active birthday template, claim it for the client, and deliver via
// in-app notification (+ email if QUEUE_EMAILS=true). Gate B: clients
// with NULL date_of_birth are skipped.
//
// Idempotent per (client, template, year): a deterministic dedupe key on
// client_offers / offer prevents double-generation if the cron runs twice
// in a day. Touches NO invoice/payment/financial table.
//
// verify_jwt=false (cron-triggered, uses service role).
// ============================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const DEBUG = "[offers-lifecycle-debug]";
const DAYS_BEFORE_DEFAULT = 7;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const QUEUE_EMAILS = (Deno.env.get("QUEUE_EMAILS") ?? "").toLowerCase() === "true";

interface BirthdayTemplate {
  id: string;
  name: string;
  discount_type: string;
  discount_value: number;
  max_discount_amount: number | null;
  validity_days_before: number;
  validity_days_after: number;
  target_countries: string[] | null;
  applicable_services: string[] | null;
  channels: string[] | null;
  is_active: boolean;
}

interface ClientRow {
  id: string;
  full_name: string | null;
  email: string | null;
  date_of_birth: string | null;
  interested_country: string | null;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Does this DOB's month-day fall exactly `daysAhead` from today?
function birthdayInDays(dob: string, daysAhead: number, now: Date): boolean {
  const target = new Date(now);
  target.setUTCDate(target.getUTCDate() + daysAhead);
  const [, m, d] = dob.split("-").map((x) => parseInt(x, 10));
  return target.getUTCMonth() + 1 === m && target.getUTCDate() === d;
}

Deno.serve(async (req) => {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const now = new Date();
  const today = ymd(now);
  const year = now.getUTCFullYear();
  let generated = 0;
  let skippedNoDob = 0;
  let campaignsActivated = 0;
  let campaignsCompleted = 0;
  let journeyProcessed = 0;
  let journeyCompleted = 0;
  const errors: string[] = [];

  try {
    // 0a. Automation journeys (O7)
    const { data: journeyResult, error: journeyErr } = await admin.rpc("fn_process_due_journey_steps", {
      _limit: 200,
    });
    if (journeyErr) {
      errors.push(`journey_process: ${journeyErr.message}`);
    } else {
      journeyProcessed = Number((journeyResult as { processed?: number })?.processed ?? 0);
      journeyCompleted = Number((journeyResult as { completed?: number })?.completed ?? 0);
    }

    // 0. Campaign calendar — planned → live on start_date; live → completed after end_date
    const { data: toActivate, error: actErr } = await admin
      .from("campaign_calendar")
      .select("id, linked_offer_id")
      .eq("status", "planned")
      .lte("start_date", today)
      .gte("end_date", today);
    if (actErr) throw actErr;

    for (const row of toActivate ?? []) {
      const { error: uErr } = await admin.from("campaign_calendar").update({ status: "live" }).eq("id", row.id);
      if (uErr) {
        errors.push(`campaign_activate ${row.id}: ${uErr.message}`);
        continue;
      }
      if (row.linked_offer_id) {
        const { error: oErr } = await admin
          .from("offers")
          .update({ status: "active", is_active: true })
          .eq("id", row.linked_offer_id);
        if (oErr) errors.push(`campaign_offer_activate ${row.linked_offer_id}: ${oErr.message}`);
      }
      campaignsActivated++;
    }

    const { data: toComplete, error: compErr } = await admin
      .from("campaign_calendar")
      .select("id, linked_offer_id")
      .eq("status", "live")
      .lt("end_date", today);
    if (compErr) throw compErr;

    for (const row of toComplete ?? []) {
      const { error: uErr } = await admin.from("campaign_calendar").update({ status: "completed" }).eq("id", row.id);
      if (uErr) {
        errors.push(`campaign_complete ${row.id}: ${uErr.message}`);
        continue;
      }
      campaignsCompleted++;
    }

    // 1. Active birthday templates
    const { data: templates, error: tErr } = await admin
      .from("offer_templates")
      .select("*")
      .eq("trigger_type", "birthday")
      .eq("is_active", true);
    if (tErr) throw tErr;
    if (!templates || templates.length === 0) {
      console.log(`${DEBUG} no_active_birthday_templates`);
      return new Response(JSON.stringify({ ok: true, generated: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Clients with a DOB (Gate B: NULL dob skipped by the query)
    const { data: clients, error: cErr } = await admin
      .from("clients")
      .select("id,full_name,email,date_of_birth,interested_country")
      .not("date_of_birth", "is", null);
    if (cErr) throw cErr;

    const allClients = (clients ?? []) as ClientRow[];

    for (const tpl of templates as BirthdayTemplate[]) {
      const daysBefore = tpl.validity_days_before ?? DAYS_BEFORE_DEFAULT;

      for (const c of allClients) {
        if (!c.date_of_birth) {
          skippedNoDob++;
          continue;
        }
        if (!birthdayInDays(c.date_of_birth, daysBefore, now)) continue;

        // Country targeting (Gate A): empty = all; else must match interested_country
        const tc = tpl.target_countries ?? [];
        if (tc.length > 0 && (!c.interested_country || !tc.includes(c.interested_country))) {
          continue;
        }

        // Deterministic per (client, template, year) dedupe via promo_code
        const dedupeCode = `BDAY-${year}-${tpl.id.slice(0, 8)}-${c.id.slice(0, 8)}`.toUpperCase();

        // Skip if an offer with this code already exists (idempotent)
        const { data: existing } = await admin.from("offers").select("id").eq("promo_code", dedupeCode).maybeSingle();
        if (existing) continue;

        // Validity window: today .. birthday + days_after
        const validFrom = ymd(now);
        const birthday = new Date(now);
        birthday.setUTCDate(birthday.getUTCDate() + daysBefore);
        const validToDate = new Date(birthday);
        validToDate.setUTCDate(validToDate.getUTCDate() + (tpl.validity_days_after ?? 7));
        const validTo = ymd(validToDate);

        // 3. Create the concrete offer
        const { data: offer, error: oErr } = await admin
          .from("offers")
          .insert({
            title: `Happy Birthday — ${tpl.name}`,
            description: `A birthday gift just for you${c.full_name ? `, ${c.full_name}` : ""}!`,
            discount_type: tpl.discount_type,
            discount_value: tpl.discount_value,
            max_discount_amount: tpl.max_discount_amount,
            promo_code: dedupeCode,
            valid_from: validFrom,
            valid_to: validTo,
            applicable_services: tpl.applicable_services ?? [],
            target_countries: tpl.target_countries ?? [],
            audience: "individual",
            is_active: true,
            per_client_limit: 1,
            template_id: tpl.id,
          })
          .select()
          .single();
        if (oErr) {
          errors.push(`offer_insert ${c.id}: ${oErr.message}`);
          continue;
        }

        // 4. Claim it for the client (source='auto')
        const { error: coErr } = await admin.from("client_offers").insert({
          client_id: c.id,
          offer_id: offer.id,
          source: "auto",
        });
        if (coErr) {
          errors.push(`client_offer ${c.id}: ${coErr.message}`);
          continue;
        }

        // 5. Analytics: delivered event
        try {
          await admin.rpc("log_offer_event", {
            _offer_id: offer.id,
            _client_id: c.id,
            _event_type: "delivered",
            _channel: "auto_birthday",
          });
        } catch (_) {
          /* best-effort */
        }

        // 6. In-app notification (best-effort).
        // app_notifications.user_id references auth.users(id), NOT clients(id).
        // Resolve the portal user(s) linked to this client via client_portal_links
        // and notify each. If the client has no portal user, skip silently.
        try {
          const { data: links } = await admin.from("client_portal_links").select("user_id").eq("client_id", c.id);
          const portalUserIds = ((links ?? []) as { user_id: string }[]).map((l) => l.user_id).filter(Boolean);
          if (portalUserIds.length > 0) {
            await admin.from("app_notifications").insert(
              portalUserIds.map((uid) => ({
                user_id: uid,
                category: "offer_published",
                severity: "info",
                title: "🎂 A birthday offer for you",
                body: offer.title,
                link: "/portal/offers",
                dedupe_key: `bday_offer:${offer.id}:${uid}`,
              })),
            );
          }
        } catch (_) {
          /* best-effort */
        }

        // 7. Email (best-effort) — only when queue path is enabled
        if (QUEUE_EMAILS && c.email) {
          try {
            await admin.rpc("enqueue_email", {
              queue_name: "notification_emails",
              payload: {
                to: c.email,
                subject: "🎂 A birthday offer just for you",
                template: "offer_birthday",
                offer_id: offer.id,
                client_id: c.id,
              },
            });
          } catch (_) {
            /* best-effort */
          }
        }

        generated++;
      }
    }

    console.log(
      `${DEBUG} done generated=${generated} skipped_no_dob=${skippedNoDob} campaigns_activated=${campaignsActivated} campaigns_completed=${campaignsCompleted} journey_processed=${journeyProcessed} journey_completed=${journeyCompleted} errors=${errors.length}`,
    );
    return new Response(
      JSON.stringify({
        ok: true,
        generated,
        skipped_no_dob: skippedNoDob,
        campaigns_activated: campaignsActivated,
        campaigns_completed: campaignsCompleted,
        journey_processed: journeyProcessed,
        journey_completed: journeyCompleted,
        errors,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error(`${DEBUG} fatal`, e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e), generated }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
