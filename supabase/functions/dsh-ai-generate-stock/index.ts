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

    const body = await req.json();
    const {
      concept = "",
      style = "photoreal",
      aspect = "landscape",
      variations = 4,
      quality = "fast",
    } = body ?? {};

    if (!concept || !String(concept).trim()) {
      return new Response(JSON.stringify({ error: "Concept is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const dims = aspect === "portrait" ? "1024x1536 vertical 2:3"
              : aspect === "square" ? "1024x1024 square 1:1"
              : aspect === "story" ? "1080x1920 vertical 9:16"
              : "1536x1024 landscape 3:2";

    const styleHint = style === "illustration" ? "vector illustration, flat shading, vivid colors, clean composition"
                    : style === "cinematic" ? "cinematic photography, shallow depth of field, golden hour lighting, 35mm film grain"
                    : style === "editorial" ? "editorial magazine photo, natural lighting, candid composition, high realism"
                    : "photoreal, sharp focus, natural lighting, high-resolution stock photography";

    const prompt = `Generate a single high-quality stock-style image suitable for use as a marketing reference.\nSubject: ${concept}.\nStyle: ${styleHint}.\nComposition: ${dims}. No on-image text, no watermarks, no logos, no captions. Leave clean negative space for later overlays.`;

    const model = quality === "premium" ? "google/gemini-3-pro-image-preview" : "google/gemini-3.1-flash-image-preview";
    const maxN = quality === "premium" ? 2 : 4;
    const n = Math.max(1, Math.min(maxN, Number(variations) || 1));

    const image_paths: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < n; i++) {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });
      if (!aiRes.ok) {
        if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await aiRes.text();
        errors.push(`variant ${i + 1}: ${aiRes.status} ${t.slice(0, 200)}`);
        continue;
      }
      const json = await aiRes.json();
      const dataUrl: string | undefined = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!dataUrl) { errors.push(`variant ${i + 1}: no image returned`); continue; }
      const m = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      if (!m) { errors.push(`variant ${i + 1}: bad data url`); continue; }
      const mime = m[1];
      const ext = mime.split("/")[1] || "png";
      const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
      const path = `ai/stock/${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("dsh-media").upload(path, bin, { contentType: mime, upsert: false });
      if (upErr) { errors.push(`variant ${i + 1} upload: ${upErr.message}`); continue; }
      image_paths.push(path);
    }

    let generation_id: string | null = null;
    if (image_paths.length) {
      const { data: gen } = await supabase.from("dsh_ai_generations").insert({
        user_id: user.id, kind: "stock", brief: body, prompt, image_paths, model,
      }).select("id").single();
      generation_id = gen?.id ?? null;
    }

    return new Response(JSON.stringify({ ok: image_paths.length > 0, generation_id, image_paths, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: image_paths.length ? 200 : 500,
    });
  } catch (e) {
    console.error("dsh-ai-generate-stock error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});