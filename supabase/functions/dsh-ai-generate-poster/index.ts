import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND_DEFAULT = `Brand: "Future Link Consultants" — a way to career abroad. Primary navy #0F2A5F, accent yellow #FFC72C, accent red #E11D2A. Use modern, clean, high-energy education marketing poster aesthetic similar to Indian study-abroad consultancies. Always include the brand wordmark "Future Link Consultants" subtly at top-left and the institution logo at top-right. Use a real young Indian student photo (smiling, holding books/backpack) with a recognizable landmark of the destination country behind. Bold display typography. Yellow brushstroke highlight bars under key phrases. Crisp icons for highlights.`;

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
      institution_name, country, service, intake, highlights, tone = "energetic",
      language = "English", format = "portrait", variations = 1, custom_instructions = "",
      use_brand = true, model = "google/gemini-3-pro-image-preview",
    } = body ?? {};

    const dims = format === "square" ? "1024x1024 square 1:1"
               : format === "story" ? "1080x1920 vertical story 9:16"
               : "1024x1536 portrait poster 2:3";

    const prompt = `Design a ${dims} promotional flyer for a study-abroad consultancy.
${use_brand ? BRAND_DEFAULT : ""}
Institution: ${institution_name || "—"}
Country: ${country || "—"}
Service / category: ${service || "Study Abroad"}
Intake: ${intake || "—"}
Key highlights (must appear as bullet points with icons): ${highlights || "—"}
Tone: ${tone}. Language for all text on the poster: ${language}.
${custom_instructions ? `Extra instructions: ${custom_instructions}` : ""}
Make sure all text is spelled correctly, legible, and the layout looks professional and print-ready. No watermarks. No placeholder lorem ipsum.`;

    const n = Math.max(1, Math.min(4, Number(variations) || 1));
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
      const path = `ai/${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("dsh-media").upload(path, bin, { contentType: mime, upsert: false });
      if (upErr) { errors.push(`variant ${i + 1} upload: ${upErr.message}`); continue; }
      image_paths.push(path);
    }

    let generation_id: string | null = null;
    if (image_paths.length) {
      const { data: gen, error: genErr } = await supabase.from("dsh_ai_generations").insert({
        user_id: user.id, kind: "poster", brief: body, prompt, image_paths, model,
      }).select("id").single();
      if (genErr) console.error("save gen err", genErr);
      generation_id = gen?.id ?? null;
    }

    return new Response(JSON.stringify({ ok: image_paths.length > 0, generation_id, image_paths, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: image_paths.length ? 200 : 500,
    });
  } catch (e) {
    console.error("dsh-ai-generate-poster error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});