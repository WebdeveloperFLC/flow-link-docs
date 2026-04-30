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
    const { token, answers, submit } = await req.json().catch(() => ({}));
    if (!token) return json({ error: "Missing token" }, 400);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: inst } = await admin.from("questionnaire_instances")
      .select("id, status, expires_at").eq("share_token", token).maybeSingle();
    if (!inst) return json({ error: "Link not found" }, 404);
    if (inst.expires_at && new Date(inst.expires_at).getTime() < Date.now())
      return json({ error: "Link has expired" }, 410);
    if (inst.status === "submitted") return json({ error: "Already submitted" }, 409);

    const patch: Record<string, unknown> = {
      answers: answers ?? {},
      last_saved_at: new Date().toISOString(),
    };
    if (submit) {
      patch.status = "submitted";
      patch.submitted_at = new Date().toISOString();
    }
    const { error } = await admin.from("questionnaire_instances").update(patch).eq("id", inst.id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Failed" }, 500);
  }
});