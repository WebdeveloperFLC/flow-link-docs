// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUMMARY_TOOL = {
  type: "function",
  function: {
    name: "produce_summary",
    description: "Produce a structured CRM summary",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        summary_md: { type: "string", description: "2-4 sentence markdown summary" },
        key_points: { type: "array", items: { type: "string" }, maxItems: 6 },
        next_action: { type: "string" },
        follow_up_role: { type: "string", enum: ["counselor", "telecaller", "none"] },
        client_intent: { type: "string" },
        urgency: { type: "string", enum: ["hot", "warm", "cold"] },
      },
      required: ["title", "summary_md", "key_points", "next_action", "follow_up_role", "urgency"],
      additionalProperties: false,
    },
  },
};

async function gatherContext(admin: any, clientId: string, scope: string, sourceId: string | null): Promise<string> {
  const parts: string[] = [];
  const { data: client } = await admin.from("clients").select("full_name, country, application_type, status, notes").eq("id", clientId).maybeSingle();
  if (client) parts.push(`Client: ${client.full_name} | ${client.country} | ${client.application_type} | status=${client.status}\nNotes: ${client.notes || "—"}`);

  if (scope === "call" && sourceId) {
    const { data: cs } = await admin.from("call_sessions").select("direction, status, disposition, duration_seconds, notes").eq("id", sourceId).maybeSingle();
    if (cs) parts.push(`Call: ${cs.direction} ${cs.status} (${cs.duration_seconds || 0}s) disposition=${cs.disposition || ""}\n${cs.notes || ""}`);
  } else if (scope === "email_thread" && sourceId) {
    const { data: msgs } = await admin.from("client_emails").select("direction,from_address,subject,body_text,created_at").eq("thread_id", sourceId).order("created_at", { ascending: true }).limit(20);
    parts.push("Email thread:\n" + (msgs ?? []).map((m: any) => `[${m.direction}] ${m.from_address}: ${m.subject}\n${m.body_text || ""}`).join("\n---\n"));
  } else if (scope === "voice_note" && sourceId) {
    const { data: t } = await admin.from("voice_note_transcripts").select("text").eq("voice_note_id", sourceId).maybeSingle();
    parts.push(`Voice note transcript:\n${t?.text || "(no transcript yet)"}`);
  } else {
    // client_overview / chat_burst: pull recent timeline
    const { data: tl } = await admin.from("client_timeline").select("event_type, summary, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(30);
    parts.push("Recent activity:\n" + (tl ?? []).map((r: any) => `- [${r.event_type}] ${r.summary}`).join("\n"));
  }
  return parts.join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = userData.user.id;

    const { client_id, scope = "client_overview", source_id = null } = await req.json();
    if (!client_id) return new Response(JSON.stringify({ error: "client_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: canView } = await admin.rpc("can_view_client", { _uid: userId, _cid: client_id });
    if (!canView) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const context = await gatherContext(admin, client_id, scope, source_id);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a CRM assistant for a visa consultancy. Produce concise, factual summaries of client activity. Avoid PII repetition; redact phone/email digits beyond last 4. Always call the produce_summary tool." },
          { role: "user", content: `Scope: ${scope}\n\n${context}\n\nProduce a structured summary.` },
        ],
        tools: [SUMMARY_TOOL],
        tool_choice: { type: "function", function: { name: "produce_summary" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited, please retry" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      throw new Error(`AI gateway ${aiResp.status}: ${t}`);
    }
    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call returned");
    const args = JSON.parse(toolCall.function.arguments);

    const { data: summary, error: insErr } = await admin
      .from("ai_summaries")
      .insert({
        client_id,
        scope,
        source_id,
        status: "suggested",
        title: args.title,
        summary_md: args.summary_md,
        key_points: args.key_points ?? [],
        next_action: args.next_action ?? null,
        follow_up_role: args.follow_up_role ?? null,
        client_intent: args.client_intent ?? null,
        urgency: args.urgency ?? null,
        generated_by_model: "google/gemini-3-flash-preview",
        created_by: userId,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    if (source_id) {
      await admin.from("ai_summary_sources").insert({ summary_id: summary.id, source_type: scope, source_id });
    }

    return new Response(JSON.stringify({ summary_id: summary.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-summarize error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});