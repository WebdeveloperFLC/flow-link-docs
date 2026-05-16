import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { institution_id, prompt, mode } = await req.json();
    if (!institution_id) throw new Error("institution_id required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [inst, sources, courses, agreements, commissions, promos] = await Promise.all([
      supabase.from("upi_institutions").select("*").eq("id", institution_id).maybeSingle(),
      supabase.from("upi_institution_sources").select("url,source_type,confidence_score,last_synced_at,extracted_records_count").eq("institution_id", institution_id),
      supabase.from("upi_courses_staging").select("course_title,program_level_id,tuition_fee,currency,intake_months,ielts_overall,is_pgwp_eligible,review_status").eq("institution_id", institution_id).limit(200),
      supabase.from("upi_agreements").select("title,agreement_type,valid_from,valid_to,status").eq("institution_id", institution_id),
      supabase.from("upi_commissions").select("name,model_type,currency,is_active,is_proposed,effective_from,effective_to").eq("institution_id", institution_id),
      supabase.from("upi_promotions").select("title,promo_type,is_active").eq("institution_id", institution_id),
    ]);

    const ctx = {
      institution: inst.data,
      sources: sources.data ?? [],
      programs_count: (courses.data ?? []).length,
      sample_programs: (courses.data ?? []).slice(0, 30),
      agreements: agreements.data ?? [],
      commissions: commissions.data ?? [],
      promotions: promos.data ?? [],
    };

    const userPrompt = (prompt && String(prompt).trim()) ||
      (mode === "generate"
        ? "Review this institution end-to-end. Surface: missing/outdated data, programs with low confidence, expiring agreements, commission gaps, promotion opportunities, and any new programs worth publishing. Return concrete, actionable suggestions."
        : "What do you notice about this institution?");

    const tool = {
      type: "function",
      function: {
        name: "respond",
        description: "Return a written answer plus 0..N concrete suggestions for the institution.",
        parameters: {
          type: "object",
          properties: {
            answer: { type: "string", description: "Markdown-formatted answer to the user's question." },
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  suggestion_type: {
                    type: "string",
                    enum: ["new_category","new_field","new_program","commission_structure","promotion","scholarship","intake_update","tuition_update","eligibility_rule","language_requirement","general"],
                  },
                  title: { type: "string" },
                  description: { type: "string" },
                  confidence: { type: "integer", minimum: 0, maximum: 100 },
                },
                required: ["suggestion_type","title","description","confidence"],
              },
            },
          },
          required: ["answer","suggestions"],
        },
      },
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an education-partnership analyst helping a study-abroad agency manage institution partners. Be concrete and specific." },
          { role: "user", content: `Question: ${userPrompt}\n\nContext:\n${JSON.stringify(ctx).slice(0, 60000)}` },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "respond" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      if (aiRes.status === 402) throw new Error("AI credits exhausted");
      if (aiRes.status === 429) throw new Error("Rate limited — try again in a moment");
      throw new Error(`AI error ${aiRes.status}: ${t.slice(0, 300)}`);
    }
    const j = await aiRes.json();
    const args = j?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { answer: "", suggestions: [] };

    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    if (suggestions.length > 0) {
      await supabase.from("upi_ai_suggestions").insert(
        suggestions.map((s: any) => ({
          institution_id,
          suggestion_type: s.suggestion_type ?? "general",
          title: String(s.title ?? "").slice(0, 300),
          description: String(s.description ?? "").slice(0, 2000),
          confidence: Math.max(0, Math.min(100, Number(s.confidence ?? 60))),
          suggestion_data: s,
        })),
      );
    }

    return new Response(JSON.stringify({ ok: true, answer: parsed.answer ?? "", suggestions_count: suggestions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});