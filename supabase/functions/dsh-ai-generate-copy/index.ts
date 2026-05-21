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
    const { institution_name, country, service, intake, highlights, tone = "energetic", language = "English", custom_instructions = "" } = body ?? {};

    const system = `You are a senior marketing copywriter for "Future Link Consultants", a study-abroad & immigration consultancy. Write punchy, accurate, on-brand copy. Respond ONLY by calling the produce_copy_pack tool.`;
    const userMsg = `Context:
Institution: ${institution_name || "—"}
Country: ${country || "—"}
Service: ${service || "Study Abroad"}
Intake: ${intake || "—"}
Highlights: ${highlights || "—"}
Tone: ${tone}
Language: ${language}
Extra: ${custom_instructions}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, { role: "user", content: userMsg }],
        tools: [{
          type: "function",
          function: {
            name: "produce_copy_pack",
            description: "Return marketing copy variants for multiple channels.",
            parameters: {
              type: "object",
              properties: {
                instagram_caption: { type: "string", description: "1–3 short paragraphs + 5–8 hashtags." },
                whatsapp_broadcast: { type: "string", description: "Under 400 chars, warm, with CTA." },
                facebook_post: { type: "string" },
                linkedin_post: { type: "string" },
                email_subject: { type: "string", description: "Under 70 chars." },
                email_body: { type: "string", description: "Professional email with greeting, 2-3 short paragraphs, sign-off." },
                sms: { type: "string", description: "Under 160 chars." },
                reel_script: { type: "string", description: "15-30s reel script: hook, 3 beats, CTA, on-screen text cues." },
                counselor_talking_points: { type: "string", description: "Bullet list for telecallers/counselors." },
              },
              required: ["instagram_caption", "whatsapp_broadcast", "email_subject", "email_body", "reel_script", "counselor_talking_points"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "produce_copy_pack" } },
      }),
    });
    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiRes.text();
      console.error("ai err", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const json = await aiRes.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    let pack: any = {};
    try { pack = JSON.parse(call?.function?.arguments ?? "{}"); } catch (_) {}

    const { data: gen } = await supabase.from("dsh_ai_generations").insert({
      user_id: user.id, kind: "copy", brief: body, prompt: userMsg, output_text: JSON.stringify(pack), model: "google/gemini-3-flash-preview",
    }).select("id").single();

    return new Response(JSON.stringify({ ok: true, generation_id: gen?.id ?? null, pack }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});