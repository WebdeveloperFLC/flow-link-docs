import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_CHARS = 80_000;
const DETAIL_MAX_CHARS = 40_000;
const MAX_DETAIL_FETCHES = 25;

const LINK_TOOL = {
  type: "function",
  function: {
    name: "extract_program_links",
    description: "From a program-list page, return distinct academic program names and their detail page URLs. Ignore navigation, news, blog or generic info pages.",
    parameters: {
      type: "object",
      properties: {
        programs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              course_title: { type: "string" },
              program_url: { type: "string" },
            },
            required: ["course_title", "program_url"],
            additionalProperties: false,
          },
        },
      },
      required: ["programs"],
      additionalProperties: false,
    },
  },
};

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
              is_pgwp_eligible: { type: "boolean", description: "True if program is designated PGWP-eligible (Post-Graduation Work Permit, Canada)" },
              stem_eligible: { type: "boolean" },
              is_online: { type: "boolean" },
              is_part_time: { type: "boolean" },
              program_url: { type: "string" },
              apply_url: { type: "string", description: "Direct application/apply-now URL if different from program_url" },
              field_of_study: {
                type: "string",
                description: "Closest match: Business & Management, IT & Computer Science, Engineering, Health & Medicine, Hospitality & Tourism, Arts & Humanities",
              },
              specialization: { type: "string" },
              gpa_requirement: { type: "string" },
              application_fee: { type: "number" },
              has_scholarship: { type: "boolean" },
              scholarship_detail: { type: "string" },
              career_outcomes: { type: "string", description: "Short summary of job/career outcomes" },
              pr_visa_notes: { type: "string", description: "Notes on PR or visa pathways relevant to this program" },
              intake_year: { type: "number" },
              campus_name: { type: "string" },
              course_description: { type: "string", description: "Concise 1-2 sentence description" },
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

    // Run the heavy work in the background and return immediately so the
    // client doesn't hit the 150s edge idle timeout.
    const work = (async () => {
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

    const SYSTEM_PROMPT =
      "You extract academic course/program data from university web pages. Return strict structured output using the provided tool. Never invent numeric fields (fees, IELTS, durations) — if not present on the page, omit them. Prefer the program's official detail page over directories. If a program runs at multiple campuses, emit one row per campus. For field_of_study, snap to the closest bucket: Business & Management, IT & Computer Science, Engineering, Health & Medicine, Hospitality & Tourism, Arts & Humanities.";

    async function callAI(userContent: string, tool: typeof COURSE_TOOL | typeof LINK_TOOL): Promise<any> {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
          tools: [tool],
          tool_choice: { type: "function", function: { name: tool.function.name } },
        }),
      });
      if (!r.ok) {
        const text = await r.text();
        if (r.status === 402) throw new Error("AI credits exhausted");
        if (r.status === 429) throw new Error("Rate limited");
        throw new Error(`AI error ${r.status}: ${text.slice(0, 300)}`);
      }
      const j = await r.json();
      const args = j?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) return null;
      try { return JSON.parse(args); } catch { return null; }
    }

    // Pass 1 — full extraction on the main URL
    await logMsg(supabase, job_id!, "info", "Extracting courses (pass 1)");
    let courses: unknown[] = [];
    try {
      const parsed = await callAI(
        `Source URL: ${source.url}\nSource type: ${source.source_type}\n\n--- PAGE MARKDOWN ---\n${markdown}`,
        COURSE_TOOL,
      );
      courses = Array.isArray(parsed?.courses) ? parsed.courses : [];
    } catch (e) {
      await logMsg(supabase, job_id!, "error", String(e));
      throw e;
    }

    // Detect thin "list page" extraction → do two-pass enrichment
    const fieldsPerCourse = courses.length ? courses.reduce((acc: number, c) => {
      const o = c as Record<string, unknown>;
      let n = 0;
      for (const k of ["tuition_fee", "ielts_overall", "intake_months", "duration_value", "is_pgwp_eligible", "course_description"]) {
        if (o[k] != null && (!Array.isArray(o[k]) || (o[k] as unknown[]).length > 0)) n++;
      }
      return acc + n;
    }, 0) / courses.length : 0;

    let pagesScanned = 1;
    if (courses.length > 40 && fieldsPerCourse < 1.5) {
      await logMsg(supabase, job_id!, "info", `List page detected (${courses.length} thin rows, avg ${fieldsPerCourse.toFixed(1)} fields). Switching to two-pass detail crawl.`);
      try {
        const linkParsed = await callAI(
          `This appears to be a program-list page. Return the program detail URLs only.\n\nSource URL: ${source.url}\n\n--- PAGE MARKDOWN ---\n${markdown}`,
          LINK_TOOL,
        );
        const links: { course_title: string; program_url: string }[] = Array.isArray(linkParsed?.programs) ? linkParsed.programs : [];
        const unique = Array.from(new Map(links.map((l) => [l.program_url, l])).values()).slice(0, MAX_DETAIL_FETCHES);
        await logMsg(supabase, job_id!, "info", `Discovered ${links.length} program links, fetching ${unique.length} detail pages`);

        const detailed: unknown[] = [];
        // Parallelize detail fetches in batches to stay fast & safe
        const CONCURRENCY = 5;
        for (let i = 0; i < unique.length; i += CONCURRENCY) {
          const batch = unique.slice(i, i + CONCURRENCY);
          const results = await Promise.all(batch.map(async (l) => {
            try {
              const dRes = await fetch(`https://r.jina.ai/${l.program_url}`, {
                headers: { Accept: "text/markdown", "X-Return-Format": "markdown" },
              });
              if (!dRes.ok) return [];
              let md = await dRes.text();
              if (md.length > DETAIL_MAX_CHARS) md = md.slice(0, DETAIL_MAX_CHARS);
              const parsed = await callAI(
                `Program: ${l.course_title}\nDetail URL: ${l.program_url}\n\n--- PAGE MARKDOWN ---\n${md}`,
                COURSE_TOOL,
              );
              const items: unknown[] = Array.isArray(parsed?.courses) ? parsed.courses : [];
              return items.map((it) => {
                const o = it as Record<string, unknown>;
                if (!o.program_url) o.program_url = l.program_url;
                if (!o.course_title) o.course_title = l.course_title;
                return o;
              });
            } catch (_) { return []; }
          }));
          for (const arr of results) {
            detailed.push(...arr);
            if (arr.length) pagesScanned++;
          }
        }
        if (detailed.length > 0) {
          courses = detailed;
          await logMsg(supabase, job_id!, "info", `Two-pass yielded ${detailed.length} enriched courses from ${pagesScanned} pages`);
        } else {
          await logMsg(supabase, job_id!, "warn", "Two-pass returned 0 enriched courses; keeping pass-1 results");
        }
      } catch (e) {
        await logMsg(supabase, job_id!, "warn", `Two-pass enrichment failed: ${String(e)}. Keeping pass-1 results.`);
      }
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
        await logMsg(supabase, job_id!, "error", `Upsert failed: ${upErr.message}`, { error: upErr });
      } else if ((upRes as any)?.error) {
        await logMsg(supabase, job_id!, "error", `Upsert returned error`, { body: upRes });
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
      pages_scanned: pagesScanned,
      pages_discovered: pagesScanned,
      completed_at: new Date().toISOString(),
    }).eq("id", job_id!);

    await supabase.from("upi_institution_sources").update({
      crawl_status: "completed",
      last_synced_at: new Date().toISOString(),
      pages_scanned: pagesScanned,
      pages_found: pagesScanned,
      extracted_records_count: upserted,
      confidence_score: avgConfidence,
    }).eq("id", source.id);
    })();

    // @ts-ignore - EdgeRuntime is available in Supabase edge runtime
    if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(work.catch(async (e) => {
        const message = e instanceof Error ? e.message : String(e);
        if (job_id) {
          await supabase.from("upi_sync_jobs").update({
            status: "failed", error_summary: message, completed_at: new Date().toISOString(),
          }).eq("id", job_id);
          await logMsg(supabase, job_id, "error", message);
        }
        if (source_id_outer) {
          await supabase.from("upi_institution_sources").update({ crawl_status: "failed" }).eq("id", source_id_outer);
        }
      }));
    } else {
      // Fallback: await (local/dev)
      await work;
    }

    return new Response(
      JSON.stringify({ ok: true, job_id, status: "running", message: "Sync started in background. Poll job status for progress." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 202 },
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