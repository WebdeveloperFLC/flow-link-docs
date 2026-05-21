import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages, knowledge } = await req.json();
    if (!Array.isArray(messages)) throw new Error("messages array required");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const system = `You are "CRM Coach", the in-app training assistant for the Future Link Consultants CRM (a study-abroad & immigration CRM).

Your job: help team members (counselors, telecallers, documentation staff, admins, accountants) learn HOW to use the CRM. Answer questions about modules, flows, where to click, how features work, troubleshooting common UX questions, and best practices.

Rules:
- Be concise and practical. Use short paragraphs, numbered steps, and bullet lists.
- When relevant, mention the exact menu path (e.g. "Sidebar → Leads → Cold Pool") and the route (e.g. \`/leads/cold\`).
- If you don't know something specific to this CRM, say so and suggest who to ask (admin / support).
- Do NOT invent data about specific clients, leads, invoices, or users — you do not have access to live tenant data.
- Format answers in Markdown.

--- CRM KNOWLEDGE BASE ---
${knowledge ?? "(no knowledge provided)"}
--- END KNOWLEDGE BASE ---`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(resp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-help-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});