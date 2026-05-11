import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Staff-only signed URL for downloading an assessment PDF.
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
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!(roles ?? []).some((r: any) => ["admin","counselor","telecaller"].includes(r.role))) return json({ error: "Forbidden" }, 403);

    const { sessionId } = await req.json();
    const { data: session } = await admin.from("assessment_sessions").select("pdf_path").eq("id", sessionId).maybeSingle();
    if (!session?.pdf_path) return json({ error: "No PDF" }, 404);
    const { data: signed } = await admin.storage.from("assessment-pdf-assets").createSignedUrl(session.pdf_path, 60 * 15);
    return json({ url: signed?.signedUrl });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
