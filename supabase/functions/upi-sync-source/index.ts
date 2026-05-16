import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_CHARS = 80_000;

const COURSE_TOOL = {
  type: "function",
  function: {
    name: "extract_courses",
    description:
      "Extract every distinct course/program found on the page. Be thorough but only include items that are real academic programs (not generic info pages). For each course, fill any field you can confidently infer; leave others null.",
    parameters: {
      type: "object",
      properties: {
        courses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              course_title: { type: "string" },
              program_level: {
                type: "string",
                description:
                  "One of: certificate, diploma, advanced_diploma, bachelor, postgraduate_diploma, master, phd, foundation, pathway, short_course, other",
              },
              field_of_study: { type: "string" },
              duration_value: { type: "number" },
              duration_unit: {
                type: "string",
                description: "years | months | weeks",
              },
              tuition_fee: { type: "number" },
              tuition_fee_per: {
                type: "string",
                description: "year | semester | total",
              },
              currency: { type: "string", description: "ISO 4217 code, e.g. CAD, USD, GBP, AUD, EUR, INR" },
              intake_months: {
                type: "array",
                items: { type: "string" },
                description: "e.g. ['Jan','May','Sep']",
              },
              ielts_overall: { type: "number" },
              pte_overall: { type: "number" },
              toefl_overall: { type: "number" },
              duolingo_overall: { type: "number" },
              has_scholarship: { type: "boolean" },
              is_coop: { type: "boolean" },
              is_pr_pathway: { type: "boolean" },
              is_online: { type: "boolean" },
              is_part_time: { type: "boolean" },
              program_url: { type: "string" },
              confidence_score: {
                type: "number",
                description: "0-100 confidence that the extracted data is correct",
              },
            },
            required: ["course_title"],
            additionalProperties: true,
          },
        },
      },
      required: ["courses"],
      additionalProperties: false,
    },
  },
};

async function logMsg(
  supabase: ReturnType<typeof createClient>,
  job_id: string,
  level: "info" | "warn" | "error",
  message: string,
  detail?: unknown,
) {
  try {
    await supabase.from("upi_sync_logs").insert({
      job_id,
      level,
      message,
      detail: detail ? (detail as Record<string, unknown>) : null,
    });
  } catch (_) { /* ignore */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let job_id: string | null = null;
  let source_id_outer: string | null = null;

  try {
    const { source_id, job_id: existing_job_id } = await req.json();
    if (!source_id) throw new Error("source_id is required");
    source_id_outer = source_id;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Load source
    const { data: source, error: srcErr } = await supabase
      .from("upi_institution_sources")
      .select("*")
      .eq("id", source_id)
      .single();
    if (srcErr || !source) throw new Error(srcErr?.message ?? "Source not found");
    if (!source.url) throw new Error("Source has no URL to fetch");

    // Create or reuse job
    if (existing_job_id) {
      job_id = existing_job_id;
      await supabase
        .from("upi_sync_jobs")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("id", job_id);
    } else {
      const { data: job, error: jobErr } = await supabase
        .from("upi_sync_jobs")
        .insert({
          source_id: source.id,
          institution_id: source.institution_id,
          status: "running",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (jobErr || !job) throw new Error(jobErr?.message ?? "Failed to create job");
      job_id = job.id;
    }

    await supabase
      .from("upi_institution_sources")
      .update({ crawl_status: "running" })
      .eq("id", source.id);

    await logMsg(supabase, job_id!, "info", `Fetching ${source.url} via Jina Reader`);

    // Fetch via Jina Reader (free, no key required)
    const jinaUrl = `https://r.jina.ai/${source.url}`;
    const fetchRes = await fetch(jinaUrl, {
      headers: { Accept: "text/markdown", "X-Return-Format": "markdown" },
    });
    if (!fetchRes.ok) {
      throw new Error(`Jina fetch failed: ${fetchRes.status} ${fetchRes.statusText}`);
    }
    let markdown = await fetchRes.text();
    const originalLen = markdown.length;
    if (markdown.length > MAX_CHARS) markdown = markdown.slice(0, MAX_CHARS);
    await logMsg(
      supabase,
      job_id!,
      "info",
      `Fetched ${originalLen} chars${originalLen > MAX_CHARS ? ` (truncated to ${MAX_CHARS})` : ""}`,
    );

    if (markdown.trim().length < 200) {
      await logMsg(supabase, job_id!, "warn", "Page content is very thin — likely JS-rendered. Consider Firecrawl for this source.");
    }

    // Call Gemini Flash with tool calling for structured output
    await logMsg(supabase, job_id!, "info", "Extracting courses with Gemini Flash");
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You extract academic course/program data from university web pages. Return strict structured output using the provided tool. Never invent fees or requirements — if a field is not present on the page, omit it.",
          },
          {
            role: "user",
            content: `Source URL: ${source.url}\nSource type: ${source.source_type}\n\n--- PAGE MARKDOWN ---\n${markdown}`,
          },
        ],
        tools: [COURSE_TOOL],
        tool_choice: { type: "function", function: { name: "extract_courses" } },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      if (aiRes.status === 402) {
        await logMsg(supabase, job_id!, "error", "Lovable AI credits exhausted. Add credits in Settings > Workspace > Usage.");
        throw new Error("AI credits exhausted");
      }
      if (aiRes.status === 429) {
        await logMsg(supabase, job_id!, "error", "AI gateway rate limit hit. Try again shortly.");
        throw new Error("Rate limited");
      }
      await logMsg(supabase, job_id!, "error", `AI gateway error ${aiRes.status}`, { body: text.slice(0, 500) });
      throw new Error(`AI error ${aiRes.status}`);
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let courses: unknown[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        courses = Array.isArray(parsed?.courses) ? parsed.courses : [];
      } catch (e) {
        await logMsg(supabase, job_id!, "error", "Failed to parse AI tool arguments", { error: String(e) });
      }
    } else {
      await logMsg(supabase, job_id!, "warn", "AI returned no tool call — no structured courses extracted");
    }

    await logMsg(supabase, job_id!, "info", `Extracted ${courses.length} candidate course(s)`);

    // Inject source_url where missing
    courses = courses.map((c) => {
      const obj = c as Record<string, unknown>;
      if (!obj.source_url) obj.source_url = source.url;
      return obj;
    });

    // Upsert via existing function
    let upserted = 0, rejected = 0;
    if (courses.length > 0) {
      const { data: upRes, error: upErr } = await supabase.functions.invoke("upi-upsert-courses", {
        body: {
          courses,
          job_id,
          institution_id: source.institution_id,
          source_id: source.id,
        },
      });
      if (upErr) {
        await logMsg(supabase, job_id!, "error", `Upsert failed: ${upErr.message}`);
      } else {
        upserted = (upRes as any)?.upserted ?? 0;
        rejected = (upRes as any)?.rejected ?? 0;
        await logMsg(supabase, job_id!, "info", `Upserted ${upserted}, rejected ${rejected}`);
      }
    }

    // Average confidence
    const confidences = courses
      .map((c) => (c as Record<string, unknown>).confidence_score)
      .filter((v): v is number => typeof v === "number");
    const avgConfidence = confidences.length
      ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
      : 0;

    // Finalize job + source
    await supabase.from("upi_sync_jobs").update({
      status: rejected > 0 && upserted === 0 ? "failed" : (rejected > 0 ? "completed_with_errors" : "completed"),
      pages_scanned: 1,
      pages_discovered: 1,
      completed_at: new Date().toISOString(),
    }).eq("id", job_id!);

    await supabase.from("upi_institution_sources").update({
      crawl_status: "completed",
      last_synced_at: new Date().toISOString(),
      pages_scanned: 1,
      pages_found: 1,
      extracted_records_count: upserted,
      confidence_score: avgConfidence,
    }).eq("id", source.id);

    return new Response(
      JSON.stringify({ ok: true, job_id, extracted: courses.length, upserted, rejected }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (job_id) {
      await supabase.from("upi_sync_jobs").update({
        status: "failed",
        error_summary: message,
        completed_at: new Date().toISOString(),
      }).eq("id", job_id);
      await logMsg(supabase, job_id, "error", message);
    }
    if (source_id_outer) {
      await supabase.from("upi_institution_sources").update({ crawl_status: "failed" }).eq("id", source_id_outer);
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});