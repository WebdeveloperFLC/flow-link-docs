import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData } = await admin.auth.getUser(token);
    const uid = userData?.user?.id;
    if (!uid) return json({ error: "Invalid session" }, 401);

    // Counselor / admin only
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid);
    const ok = (roles ?? []).some((r) => ["admin", "counselor"].includes(r.role));
    if (!ok) return json({ error: "Counselor access required" }, 403);

    const body = await req.json().catch(() => ({}));
    const goal = typeof body.goal === "string" && body.goal ? body.goal : "permanent_residence";
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
          country: nc.country?.trim() || "India",
          application_type: nc.application_type?.trim() || "Canada PR",
          owner_id: uid,
          created_by: uid,
          lead_source: "assessment",
        })
        .select("id")
        .single();
      if (insErr || !ins) return json({ error: insErr?.message ?? "Could not create client" }, 500);
      clientId = ins.id;
    }

    if (!clientId) return json({ error: "Either clientId or newClient required" }, 400);

    const { data: ses, error: sesErr } = await admin
      .from("assessment_sessions")
      .insert({
        client_id: clientId,
        country: "Canada",
        goal,
        status: "draft",
        assigned_counselor_id: uid,
      })
      .select("id")
      .single();
    if (sesErr || !ses) return json({ error: sesErr?.message ?? "Could not create session" }, 500);

    return json({ sessionId: ses.id, clientId });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Failed" }, 500);
  }
});