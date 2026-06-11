import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolveSettleAbroadMapping, usesSettleAbroadAssessment } from "../_shared/settleAbroadBridge.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function assertVisaService(admin: ReturnType<typeof createClient>, libraryId: string) {
  const { data: row } = await admin
    .from("service_library")
    .select("id, service_category, service, sub_service")
    .eq("id", libraryId)
    .maybeSingle();
  if (!row || row.service_category !== "visa_immigration") {
    throw new Error("Eligibility assessment is only available for Visa & Immigration services");
  }
  return row;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "staff_create";

    if (action === "public_preview") {
      const libraryId = body.libraryId as string;
      if (!libraryId) return json({ error: "libraryId required" }, 400);
      const svc = await assertVisaService(admin, libraryId);
      const mapping = resolveSettleAbroadMapping(libraryId);
      return json({
        title: `${svc.service} – ${svc.sub_service}`,
        fullAssessment: usesSettleAbroadAssessment(libraryId),
        country: mapping?.country ?? svc.service ?? "Canada",
      });
    }

    if (action === "public_create_settle_abroad") {
      const libraryId = body.libraryId as string;
      const name = (body.name ?? "").trim();
      const email = (body.email ?? "").trim().toLowerCase();
      if (!libraryId || !name || !email) return json({ error: "libraryId, name, and email required" }, 400);

      const mapping = resolveSettleAbroadMapping(libraryId);
      if (!mapping) return json({ error: "This service does not use the full eligibility assessment" }, 400);

      await assertVisaService(admin, libraryId);
      const token = crypto.randomUUID();

      const { data: ses, error } = await admin
        .from("assessment_sessions")
        .insert({
          library_id: libraryId,
          assessment_kind: "settle_abroad",
          source: "public_link",
          public_token: token,
          prospect_name: name,
          prospect_email: email,
          prospect_phone: body.phone?.trim() || null,
          country: mapping.country,
          goal: mapping.goal,
          status: "draft",
          answers: {},
        })
        .select("id, public_token")
        .single();
      if (error || !ses) return json({ error: error?.message ?? "Could not create session" }, 500);
      return json({ sessionId: ses.id, publicToken: ses.public_token });
    }

    if (action === "public_save_settle_abroad") {
      const token = body.publicToken as string;
      if (!token) return json({ error: "publicToken required" }, 400);
      const patch: Record<string, unknown> = {
        answers: body.answers ?? {},
        updated_at: new Date().toISOString(),
        status: "in_progress",
      };
      const { data, error } = await admin
        .from("assessment_sessions")
        .update(patch)
        .eq("public_token", token)
        .eq("assessment_kind", "settle_abroad")
        .select("id")
        .maybeSingle();
      if (error || !data) return json({ error: error?.message ?? "Session not found" }, 404);
      return json({ ok: true, sessionId: data.id });
    }

    if (action === "public_create") {
      const libraryId = body.libraryId as string;
      const name = (body.name ?? "").trim();
      const email = (body.email ?? "").trim().toLowerCase();
      if (!libraryId || !name || !email) return json({ error: "libraryId, name, and email required" }, 400);

      const svc = await assertVisaService(admin, libraryId);
      const token = crypto.randomUUID();

      const { data: ses, error } = await admin
        .from("assessment_sessions")
        .insert({
          library_id: libraryId,
          assessment_kind: "service_eligibility",
          source: "public_link",
          public_token: token,
          prospect_name: name,
          prospect_email: email,
          prospect_phone: body.phone?.trim() || null,
          country: svc.service ?? "Canada",
          goal: "service_eligibility",
          status: "draft",
        })
        .select("id, public_token")
        .single();
      if (error || !ses) return json({ error: error?.message ?? "Could not create session" }, 500);
      return json({ sessionId: ses.id, publicToken: ses.public_token });
    }

    if (action === "public_save" || action === "public_submit") {
      const token = body.publicToken as string;
      if (!token) return json({ error: "publicToken required" }, 400);
      const patch: Record<string, unknown> = {
        answers: body.answers ?? {},
        updated_at: new Date().toISOString(),
      };
      if (body.prospectNotes != null) patch.prospect_notes = body.prospectNotes;
      if (body.pendingItems != null) patch.pending_items = body.pendingItems;
      if (body.output != null) patch.output = body.output;
      if (action === "public_submit") {
        patch.status = "submitted";
        patch.submitted_at = new Date().toISOString();
      } else {
        patch.status = "in_progress";
      }

      const { data, error } = await admin
        .from("assessment_sessions")
        .update(patch)
        .eq("public_token", token)
        .eq("assessment_kind", "service_eligibility")
        .select("id")
        .maybeSingle();
      if (error || !data) return json({ error: error?.message ?? "Session not found" }, 404);
      return json({ ok: true, sessionId: data.id });
    }

    // staff_create (default)
    const authHeader = req.headers.get("Authorization") ?? "";
    const uid = (await admin.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""))).data.user?.id;
    if (!uid) return json({ error: "Not authenticated" }, 401);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid);
    const ok = (roles ?? []).some((r) =>
      ["admin", "administrator", "counselor", "documentation", "telecaller"].includes(r.role),
    );
    if (!ok) return json({ error: "Staff access required" }, 403);

    const libraryId = body.libraryId as string;
    if (!libraryId) return json({ error: "libraryId required" }, 400);
    const svc = await assertVisaService(admin, libraryId);

    let clientId: string | null = body.clientId ?? null;
    if (!clientId && body.newClient) {
      const nc = body.newClient ?? {};
      const full_name = (nc.full_name ?? "").trim();
      if (!full_name) return json({ error: "Client name required" }, 400);
      const { data: ins, error: insErr } = await admin
        .from("clients")
        .insert({
          full_name,
          email: nc.email ? String(nc.email).trim() : null,
          phone: nc.phone ? String(nc.phone).trim() : null,
          country: nc.country?.trim() || svc.service || "India",
          application_type: `${svc.sub_service} — eligibility`,
          owner_id: uid,
          created_by: uid,
          lead_source: "service_library",
        })
        .select("id")
        .single();
      if (insErr || !ins) return json({ error: insErr?.message ?? "Could not create client" }, 500);
      clientId = ins.id;
    }
    if (!clientId) return json({ error: "clientId or newClient required" }, 400);

    const prefill = body.prefillAnswers ?? {};

    const { data: ses, error: sesErr } = await admin
      .from("assessment_sessions")
      .insert({
        client_id: clientId,
        library_id: libraryId,
        assessment_kind: "service_eligibility",
        source: "staff",
        country: svc.service ?? "Canada",
        goal: "service_eligibility",
        status: "draft",
        answers: prefill,
        assigned_counselor_id: uid,
        created_by: uid,
      })
      .select("id")
      .single();
    if (sesErr || !ses) return json({ error: sesErr?.message ?? "Could not create session" }, 500);

    return json({ sessionId: ses.id, clientId });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Failed" }, 500);
  }
});
