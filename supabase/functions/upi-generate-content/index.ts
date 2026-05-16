import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHANNEL_STYLE: Record<string, string> = {
  email: "Professional email with subject line, greeting, body paragraphs, and sign-off.",
  whatsapp: "Short conversational WhatsApp message (under 400 chars), warm tone, with one clear CTA.",
  social_post: "Punchy social media post under 280 chars with 2-3 relevant hashtags.",
  brochure: "Brochure-style blurb (3 short sections: headline, key benefits, call to action).",
  counselor_note: "Internal counselor brief: bullets covering programs, scholarships, eligibility, commission.",
  sms: "Single SMS under 160 chars with one CTA.",
  push: "Push notification: title (max 50 chars) + body (max 120 chars).",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { institution_id, channel, context_flags = {}, tone = "professional" } = await req.json();
    if (!institution_id || !channel) throw new Error("institution_id and channel required");
    const style = CHANNEL_STYLE[channel] ?? CHANNEL_STYLE.email;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const [{ data: inst }, { data: courses }, { data: promos }, { data: comm }] = await Promise.all([
      supabase.from("upi_institutions").select("*").eq("id", institution_id).single(),
      context_flags.programs ? supabase.from("upi_courses_staging").select("course_title,tuition_fee,currency,intake_months,ielts_overall,has_scholarship,is_pr_pathway").eq("institution_id", institution_id).limit(20) : Promise.resolve({ data: [] }),
      context_flags.promotions ? supabase.from("upi_promotions").select("title,description,promo_type").eq("institution_id", institution_id).eq("is_active", true) : Promise.resolve({ data: [] }),
      context_flags.commission ? supabase.from("upi_commissions").select("name,model_type,currency,description").eq("institution_id", institution_id).eq("is_active", true) : Promise.resolve({ data: [] }),
    ]);
    if (!inst) throw new Error("Institution not found");

    const context = `Institution: ${inst.name} (${inst.country_name ?? "?"})\nWebsite: ${inst.website_url ?? "?"}\nPrograms:\n${JSON.stringify(courses ?? [], null, 2)}\nActive promotions:\n${JSON.stringify(promos ?? [], null, 2)}\nCommission:\n${JSON.stringify(comm ?? [], null, 2)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `You are a marketing writer for an education consultancy. Tone: ${tone}. Format: ${style}` },
          { role: "user", content: `Write content for the ${channel} channel using this context:\n\n${context}` },
        ],
      }),
    });
    if (!aiRes.ok) {
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "Lovable AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error ${aiRes.status}`);
    }
    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ ok: true, content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});