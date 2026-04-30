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
    const { token } = await req.json().catch(() => ({}));
    if (!token) return json({ error: "Missing token" }, 400);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: inst } = await admin.from("questionnaire_instances")
      .select("*").eq("share_token", token).maybeSingle();
    if (!inst) return json({ error: "Link not found" }, 404);
    if (inst.expires_at && new Date(inst.expires_at).getTime() < Date.now())
      return json({ error: "Link has expired" }, 410);

    const { data: schema } = await admin.from("questionnaire_schemas")
      .select("id, name, sections").eq("id", inst.schema_id).maybeSingle();
    if (!schema) return json({ error: "Form schema missing" }, 404);

    const { data: client } = await admin.from("clients")
      .select("full_name, country, application_type").eq("id", inst.client_id).maybeSingle();

    return json({
      instance: {
        id: inst.id, status: inst.status, answers: inst.answers ?? {},
        submitted_at: inst.submitted_at, last_saved_at: inst.last_saved_at,
      },
      schema: { id: schema.id, name: schema.name, sections: schema.sections ?? [] },
      client: client ?? null,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Failed" }, 500);
  }
});