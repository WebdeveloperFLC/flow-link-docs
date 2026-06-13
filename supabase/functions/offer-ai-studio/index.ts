import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: allowed, error: gateErr } = await svc.rpc("fn_can_use_offer_ai_studio", { _user_id: userId });
    if (gateErr) return json({ error: gateErr.message }, 500);
    if (!allowed) return json({ error: "Forbidden: AI Offer Studio is MarCom/Admin only" }, 403);

    const body = await req.json();
    const {
      goal = "",
      audience = "prospective students",
      country = "",
      service_line = "",
      discount_hint = "",
      funding = "future_link",
      tone = "professional",
      extra = "",
    } = body ?? {};

    const system =
      `You are a senior MarCom strategist for Future Link Consultants (study abroad & immigration). ` +
      `Draft ONE promotional offer for internal review. Never promise guaranteed visa/admission. ` +
      `Respond ONLY by calling produce_offer_draft. Funding context: ${funding}.`;

    const userMsg = `Goal: ${goal || "Drive enrolments"}
Audience: ${audience}
Country focus: ${country || "Any"}
Service line: ${service_line || "Any"}
Discount hint: ${discount_hint || "10% or flat amount — your recommendation"}
Tone: ${tone}
Extra: ${extra || "—"}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, { role: "user", content: userMsg }],
        tools: [{
          type: "function",
          function: {
            name: "produce_offer_draft",
            description: "Structured offer draft for MarCom review",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                offer_category: { type: "string" },
                discount_type: { type: "string", enum: ["percentage", "flat"] },
                discount_value: { type: "number" },
                promo_code: { type: "string" },
                target_countries: { type: "array", items: { type: "string" } },
                valid_days: { type: "number", description: "Suggested validity in days from today" },
                whatsapp_copy: { type: "string" },
                email_subject: { type: "string" },
                email_body: { type: "string" },
                counselor_talking_points: { type: "string" },
                terms_conditions: { type: "string" },
              },
              required: ["title", "description", "discount_type", "discount_value", "whatsapp_copy", "counselor_talking_points"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "produce_offer_draft" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return json({ error: "Rate limited — try again shortly" }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted" }, 402);
      const t = await aiRes.text();
      console.error("offer-ai-studio ai error", aiRes.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    const aiJson = await aiRes.json();
    const call = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    let draft: Record<string, unknown> = {};
    try {
      draft = JSON.parse(call?.function?.arguments ?? "{}");
    } catch {
      return json({ error: "AI returned invalid draft" }, 500);
    }

    const { data: gen, error: logErr } = await svc.from("offer_ai_generations").insert({
      created_by: userId,
      brief: body,
      result: draft,
      model: "google/gemini-3-flash-preview",
    }).select("id").single();

    if (logErr) console.warn("offer_ai_generations insert failed", logErr.message);

    return json({ ok: true, generation_id: gen?.id ?? null, draft, suggestion_level: "L1" });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
