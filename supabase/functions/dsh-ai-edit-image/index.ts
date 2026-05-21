import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supaUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supaUser.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { image_data_url, instruction, model = "google/gemini-3.1-flash-image-preview" } = await req.json();
    if (!image_data_url || !instruction) {
      return new Response(JSON.stringify({ error: "image_data_url and instruction required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: instruction },
            { type: "image_url", image_url: { url: image_data_url } },
          ],
        }],
        modalities: ["image", "text"],
      }),
    });
    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI error ${aiRes.status}: ${t.slice(0,200)}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const json = await aiRes.json();
    const dataUrl: string | undefined = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl) return new Response(JSON.stringify({ error: "No image returned" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const m = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (!m) return new Response(JSON.stringify({ error: "Bad image data" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const mime = m[1];
    const ext = mime.split("/")[1] || "png";
    const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    const path = `ai/${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("dsh-media").upload(path, bin, { contentType: mime });
    if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: gen } = await supabase.from("dsh_ai_generations").insert({
      user_id: user.id, kind: "edit", brief: { instruction }, prompt: instruction, image_paths: [path], model,
    }).select("id").single();

    return new Response(JSON.stringify({ ok: true, generation_id: gen?.id ?? null, image_path: path }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});