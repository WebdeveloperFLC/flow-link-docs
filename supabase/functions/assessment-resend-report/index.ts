import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { data: { user } } = await createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } }).auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);
    const admin = createClient(supabaseUrl, serviceKey);

    const { sessionId } = await req.json();
    const { data: session } = await admin.from("assessment_sessions")
      .select("id, pdf_path, lead:assessment_leads(id, email, first_name, auth_user_id)").eq("id", sessionId).maybeSingle();
    if (!session?.pdf_path) return json({ error: "No report available yet" }, 404);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isStaff = (roles ?? []).some((r: any) => ["admin","counselor","telecaller"].includes(r.role));
    const isOwner = (session.lead as any)?.auth_user_id === user.id;
    if (!isStaff && !isOwner) return json({ error: "Forbidden" }, 403);

    const { data: signed } = await admin.storage.from("assessment-pdf-assets").createSignedUrl(session.pdf_path, 60 * 60 * 24 * 7);

    await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "assessment-report",
        recipientEmail: (session.lead as any).email,
        idempotencyKey: `assessment-report-resend-${sessionId}-${Date.now()}`,
        templateData: { firstName: (session.lead as any).first_name, reportUrl: signed?.signedUrl ?? "" },
      },
    });

    await admin.from("assessment_sessions").update({ last_emailed_at: new Date().toISOString() }).eq("id", sessionId);

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
