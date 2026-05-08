import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const sessionId = String(body.sessionId ?? "");
    if (!sessionId) return json({ error: "sessionId required" }, 400);

    // RLS-respecting fetch — confirms the caller can read the session
    const { data: session, error: sErr } = await userClient
      .from("call_sessions")
      .select("id, client_id, recording_url")
      .eq("id", sessionId)
      .maybeSingle();
    if (sErr || !session) return json({ error: "Not found or forbidden" }, 404);
    if (!session.recording_url) return json({ error: "No recording yet" }, 404);

    const admin = createClient(SUPABASE_URL, SUPABASE_SR, { auth: { persistSession: false } });

    let url = session.recording_url;
    // If recording_url points to a storage path inside our project, sign it for 10 minutes.
    if (!/^https?:\/\//i.test(url)) {
      const [bucket, ...rest] = url.split("/");
      const path = rest.join("/");
      const { data: signed, error: signErr } = await admin.storage.from(bucket).createSignedUrl(path, 600);
      if (signErr || !signed) return json({ error: signErr?.message ?? "sign failed" }, 500);
      url = signed.signedUrl;
    }

    await admin.from("telephony_audit_logs").insert({
      actor_id: userId,
      session_id: session.id,
      client_id: session.client_id,
      event_type: "recording_accessed",
      details: {},
    });

    return json({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});