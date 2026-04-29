const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const filename = String(body?.filename ?? "").slice(0, 300);
    const snippet = String(body?.snippet ?? "").slice(0, 2000);
    const isImage = !!body?.is_image;
    const allowed: string[] = Array.isArray(body?.allowed_types) ? body.allowed_types.slice(0, 50) : [];
    if (!filename || allowed.length === 0) return json({ error: "missing fields" }, 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ type: "Other", confidence: 0, reason: "no_api_key" });

    const sys =
      "You classify uploaded immigration / study-abroad documents into one of the provided category labels. Respond ONLY with strict JSON: {\"type\":<one of allowed>,\"confidence\":0..1,\"suggested_label\":<string or null>,\"reason\":<short>}. If unsure, use \"Other\" with low confidence.";

    const user = `Allowed types: ${JSON.stringify(allowed)}\nFilename: ${filename}\nIs image: ${isImage}\nFirst-page text (may be empty for scans):\n"""${snippet}"""\n\nReturn only JSON.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 429) return json({ type: "Other", confidence: 0, reason: "rate_limited" });
    if (resp.status === 402) return json({ type: "Other", confidence: 0, reason: "no_credits" });
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      return json({ type: "Other", confidence: 0, reason: `ai_error:${resp.status}`, detail: t.slice(0, 300) });
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { type?: string; confidence?: number; suggested_label?: string | null; reason?: string } = {};
    try { parsed = JSON.parse(content); } catch { /* keep empty */ }
    const type = parsed.type && allowed.includes(parsed.type) ? parsed.type : "Other";
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.4;
    return json({
      type,
      confidence,
      suggested_label: parsed.suggested_label ?? null,
      reason: parsed.reason ?? null,
    });
  } catch (e) {
    return json({ type: "Other", confidence: 0, reason: e instanceof Error ? e.message : "unknown" });
  }
});