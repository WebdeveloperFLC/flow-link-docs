import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_CHARS = 80_000;
const DETAIL_MAX_CHARS = 40_000;
const MAX_DETAIL_FETCHES = 120;
const MAX_CATEGORY_FETCHES = 20;
const CONCURRENCY = 5;

const LISTY_URL_HINTS = ["/programs", "/program/", "/courses", "/course/", "/study", "/academics", "/list", "/faculties", "/schools", "/area-of-study"];
const SKIP_URL_HINTS = ["/news", "/blog", "/events", "/about", "/contact", "/login", "/apply-now", "/staff", "/faculty-staff", "/library", "/alumni", "/giving", "/parents", "/media", "/privacy", "/terms"];

const LINK_TOOL = {
  type: "function",
  function: {
    name: "extract_program_links",
    description: "From a program-list or category page, return distinct academic program names and their detail page URLs. Ignore navigation, news, blog, staff, or generic info pages. Prefer URLs that look like a single program detail page (e.g. /programs/fulltime/AIG.html).",
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
      "Extract every distinct course/program found on the page. Be thorough but only include real academic programs. Leave fields null if not present — never invent.",
    parameters: {
      type: "object",
      properties: {
        courses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              course_title: { type: "string" },
              program_code: { type: "string", description: "Short institution code, e.g. AIG, BSD-3Y" },
              program_level: {
                type: "string",
                description:
                  "One of: certificate, diploma, advanced_diploma, bachelor, postgraduate_diploma, master, phd, foundation, pathway, short_course, other",
              },
              field_of_study: {
                type: "string",
                description: "Closest match: Business & Management, IT & Computer Science, Engineering, Health & Medicine, Hospitality & Tourism, Arts & Humanities",
              },
              specialization: { type: "string" },
              duration_value: { type: "number" },
              duration_unit: { type: "string", description: "years | months | weeks" },
              tuition_fee: { type: "number" },
              tuition_fee_per: { type: "string", description: "year | semester | total" },
              currency: { type: "string", description: "ISO 4217 code" },
              application_fee: { type: "number" },
              processing_time_weeks: { type: "number", description: "Typical admissions processing time in weeks" },
              intake_months: { type: "array", items: { type: "string" }, description: "e.g. ['Jan','May','Sep']" },
              intake_year: { type: "number" },
              ielts_overall: { type: "number" },
              pte_overall: { type: "number" },
              toefl_overall: { type: "number" },
              duolingo_overall: { type: "number" },
              gpa_requirement: { type: "string" },
              has_scholarship: { type: "boolean" },
              scholarship_detail: { type: "string" },
              is_coop: { type: "boolean" },
              coop_duration_months: { type: "number" },
              is_pr_pathway: { type: "boolean" },
              is_pgwp_eligible: { type: "boolean", description: "True if program is PGWP-eligible (Post-Graduation Work Permit, Canada)" },
              stem_eligible: { type: "boolean" },
              is_online: { type: "boolean" },
              is_part_time: { type: "boolean" },
              seats_available: { type: "number" },
              program_url: { type: "string" },
              apply_url: { type: "string" },
              campus_name: { type: "string" },
              course_description: { type: "string", description: "Concise 1-2 sentence description" },
              career_outcomes: { type: "string" },
              pr_visa_notes: { type: "string" },
              confidence_score: { type: "number", description: "0-100 confidence" },
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

function normalizeUrl(raw: string, base: string): string | null {
  try {
    const u = new URL(raw, base);
    u.hash = "";
    // strip tracking params
    ["utm_source","utm_medium","utm_campaign","utm_term","utm_content"].forEach(k => u.searchParams.delete(k));
    return u.toString().replace(/\/$/, "");
  } catch { return null; }
}

function looksListy(url: string): boolean {
  const u = url.toLowerCase();
  return LISTY_URL_HINTS.some(h => u.includes(h));
}

function shouldSkipUrl(url: string, originHost: string): boolean {
  try {
    const u = new URL(url);
    if (u.host !== originHost) return true;
    const p = u.pathname.toLowerCase();
    if (SKIP_URL_HINTS.some(h => p.includes(h))) return true;
    if (/\.(pdf|jpg|jpeg|png|gif|zip|docx?|xlsx?)$/i.test(p)) return true;
    return false;
  } catch { return true; }
}

async function logMsg(
  supabase: ReturnType<typeof createClient>,
  job_id: string,
  level: "info" | "warn" | "error",
  message: string,
  detail?: unknown,
) {
  try {
    await supabase.from("upi_sync_logs").insert({
      job_id, level, message,
      detail: detail ? (detail as Record<string, unknown>) : null,
    });
  } catch (_) { /* ignore */ }
}

async function fetchMarkdown(url: string, maxChars: number): Promise<string | null> {
  try {
    const r = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: "text/markdown", "X-Return-Format": "markdown" },
    });
    if (!r.ok) return null;
    let md = await r.text();
    if (md.length > maxChars) md = md.slice(0, maxChars);
    return md;
  } catch { return null; }
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

    const { data: source, error: srcErr } = await supabase
      .from("upi_institution_sources").select("*").eq("id", source_id).single();
    if (srcErr || !source) throw new Error(srcErr?.message ?? "Source not found");
    if (!source.url) throw new Error("Source has no URL to fetch");

    if (existing_job_id) {
      job_id = existing_job_id;
      await supabase.from("upi_sync_jobs")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("id", job_id);
    } else {
      const { data: job, error: jobErr } = await supabase
        .from("upi_sync_jobs")
        .insert({
          source_id: source.id, institution_id: source.institution_id,
          status: "running", started_at: new Date().toISOString(),
        }).select().single();
      if (jobErr || !job) throw new Error(jobErr?.message ?? "Failed to create job");
      job_id = job.id;
    }

    await supabase.from("upi_institution_sources")
      .update({ crawl_status: "running" }).eq("id", source.id);

    const work = (async () => {
      const SYSTEM_PROMPT_DETAIL =
        "You extract academic program data from a SINGLE program's detail page. Emit exactly one course row unless the page clearly lists multiple campuses/delivery modes for the same program (then one row per campus). Never invent fees, IELTS, durations, or dates — if absent, omit. Be precise.";
      const SYSTEM_PROMPT_LIST =
        "You extract academic course/program data from university web pages. Return strict structured output. Never invent numeric fields. For field_of_study, snap to one of: Business & Management, IT & Computer Science, Engineering, Health & Medicine, Hospitality & Tourism, Arts & Humanities.";

      async function callAI(systemPrompt: string, userContent: string, tool: typeof COURSE_TOOL | typeof LINK_TOOL): Promise<any> {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
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

      async function discoverLinks(pageUrl: string, md: string): Promise<{ course_title: string; program_url: string }[]> {
        const parsed = await callAI(
          SYSTEM_PROMPT_LIST,
          `This may be a program-list or category page. Return distinct program detail URLs only.\n\nSource URL: ${pageUrl}\n\n--- PAGE MARKDOWN ---\n${md}`,
          LINK_TOOL,
        );
        const links: { course_title: string; program_url: string }[] = Array.isArray(parsed?.programs) ? parsed.programs : [];
        const origin = new URL(pageUrl).host;
        const seen = new Set<string>();
        const out: { course_title: string; program_url: string }[] = [];
        for (const l of links) {
          const norm = normalizeUrl(l.program_url, pageUrl);
          if (!norm || shouldSkipUrl(norm, origin) || seen.has(norm)) continue;
          seen.add(norm);
          out.push({ course_title: l.course_title, program_url: norm });
        }
        return out;
      }

      await logMsg(supabase, job_id!, "info", `Fetching ${source.url} via Jina Reader`);
      const rootMd = await fetchMarkdown(source.url, MAX_CHARS);
      if (!rootMd) throw new Error(`Jina fetch failed for ${source.url}`);
      await logMsg(supabase, job_id!, "info", `Fetched root page (${rootMd.length} chars)`);

      let pagesScanned = 1;
      let courses: unknown[] = [];

      // Step 1: discover links
      const rootIsListy = looksListy(source.url) || ["website","program_list","sitemap","list_page"].includes(source.source_type ?? "");
      let programLinks: { course_title: string; program_url: string }[] = [];

      if (rootIsListy) {
        await logMsg(supabase, job_id!, "info", "Root URL looks listy — discovering program links");
        programLinks = await discoverLinks(source.url, rootMd);
        await logMsg(supabase, job_id!, "info", `Discovered ${programLinks.length} direct program links from root`);
      }

      // Step 2: if too few direct links, two-level expansion via category pages
      if (rootIsListy && programLinks.length < 3) {
        await logMsg(supabase, job_id!, "info", "Few direct programs — expanding via category pages");
        // Heuristic: use link extractor to gather any listy URLs from root
        const candidateCats = await discoverLinks(source.url, rootMd);
        const origin = new URL(source.url).host;
        const categoryUrls = Array.from(new Set(
          candidateCats
            .map(c => c.program_url)
            .filter(u => looksListy(u) && !shouldSkipUrl(u, origin))
        )).slice(0, MAX_CATEGORY_FETCHES);

        await logMsg(supabase, job_id!, "info", `Trying ${categoryUrls.length} category pages`);
        for (let i = 0; i < categoryUrls.length; i += CONCURRENCY) {
          const batch = categoryUrls.slice(i, i + CONCURRENCY);
          const results = await Promise.all(batch.map(async (cUrl) => {
            const md = await fetchMarkdown(cUrl, MAX_CHARS);
            if (!md) return [];
            pagesScanned++;
            return discoverLinks(cUrl, md).catch(() => []);
          }));
          for (const arr of results) programLinks.push(...arr);
        }
        // dedupe
        const seen = new Set<string>();
        programLinks = programLinks.filter(l => {
          if (seen.has(l.program_url)) return false;
          seen.add(l.program_url); return true;
        });
        await logMsg(supabase, job_id!, "info", `After category expansion: ${programLinks.length} program links`);
      }

      // Step 3: detail crawl
      if (programLinks.length >= 3) {
        const toFetch = programLinks.slice(0, MAX_DETAIL_FETCHES);
        await logMsg(supabase, job_id!, "info", `Detail-crawling ${toFetch.length} of ${programLinks.length} program pages`);
        const detailed: unknown[] = [];
        for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
          const batch = toFetch.slice(i, i + CONCURRENCY);
          const results = await Promise.all(batch.map(async (l) => {
            const md = await fetchMarkdown(l.program_url, DETAIL_MAX_CHARS);
            if (!md) return [];
            pagesScanned++;
            try {
              const parsed = await callAI(
                SYSTEM_PROMPT_DETAIL,
                `Program: ${l.course_title}\nDetail URL: ${l.program_url}\n\n--- PAGE MARKDOWN ---\n${md}`,
                COURSE_TOOL,
              );
              const items: unknown[] = Array.isArray(parsed?.courses) ? parsed.courses : [];
              return items.map((it) => {
                const o = it as Record<string, unknown>;
                if (!o.program_url) o.program_url = l.program_url;
                o.source_url = l.program_url;
                if (!o.course_title) o.course_title = l.course_title;
                return o;
              });
            } catch (_) { return []; }
          }));
          for (const arr of results) detailed.push(...arr);
        }
        courses = detailed;
        await logMsg(supabase, job_id!, "info", `Detail crawl yielded ${detailed.length} programs from ${pagesScanned} pages`);
      } else {
        // Fallback: single-page extraction
        await logMsg(supabase, job_id!, "info", "Falling back to single-page extraction");
        try {
          const parsed = await callAI(
            SYSTEM_PROMPT_LIST,
            `Source URL: ${source.url}\nSource type: ${source.source_type}\n\n--- PAGE MARKDOWN ---\n${rootMd}`,
            COURSE_TOOL,
          );
          courses = Array.isArray(parsed?.courses) ? parsed.courses : [];
        } catch (e) {
          await logMsg(supabase, job_id!, "error", String(e));
          throw e;
        }
      }

      // Score & enrich
      const numericKeys = ["tuition_fee","ielts_overall","pte_overall","toefl_overall","duration_value","application_fee","processing_time_weeks"];
      courses = courses.map((c) => {
        const o = c as Record<string, unknown>;
        if (!o.source_url) o.source_url = source.url;
        const filled = numericKeys.filter(k => o[k] != null).length
          + (Array.isArray(o.intake_months) && (o.intake_months as unknown[]).length > 0 ? 1 : 0);
        if (o.confidence_score == null || typeof o.confidence_score !== "number" || o.confidence_score === 0) {
          o.confidence_score = filled === 0 ? 40 : Math.min(95, 50 + filled * 8);
        }
        return o;
      });

      await logMsg(supabase, job_id!, "info", `Extracted ${courses.length} candidate course(s)`);

      // Upsert
      let upserted = 0, rejected = 0;
      if (courses.length > 0) {
        const { data: upRes, error: upErr } = await supabase.functions.invoke("upi-upsert-courses", {
          body: { courses, job_id, institution_id: source.institution_id, source_id: source.id },
        });
        if (upErr) await logMsg(supabase, job_id!, "error", `Upsert failed: ${upErr.message}`, { error: upErr });
        else if ((upRes as any)?.error) await logMsg(supabase, job_id!, "error", `Upsert returned error`, { body: upRes });
        else {
          upserted = (upRes as any)?.upserted ?? 0;
          rejected = (upRes as any)?.rejected ?? 0;
          await logMsg(supabase, job_id!, "info", `Upserted ${upserted}, rejected ${rejected}`);
        }
      }

      const confidences = courses
        .map(c => (c as Record<string, unknown>).confidence_score)
        .filter((v): v is number => typeof v === "number");
      const avgConfidence = confidences.length
        ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length) : 0;

      await supabase.from("upi_sync_jobs").update({
        status: rejected > 0 && upserted === 0 ? "failed" : (rejected > 0 ? "completed_with_errors" : "completed"),
        pages_scanned: pagesScanned, pages_discovered: pagesScanned,
        completed_at: new Date().toISOString(),
      }).eq("id", job_id!);

      await supabase.from("upi_institution_sources").update({
        crawl_status: "completed", last_synced_at: new Date().toISOString(),
        pages_scanned: pagesScanned, pages_found: pagesScanned,
        extracted_records_count: upserted, confidence_score: avgConfidence,
      }).eq("id", source.id);
    })();

    // @ts-ignore
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
        status: "failed", error_summary: message, completed_at: new Date().toISOString(),
      }).eq("id", job_id);
      await logMsg(supabase, job_id, "error", message);
    }
    if (source_id_outer) {
      await supabase.from("upi_institution_sources").update({ crawl_status: "failed" }).eq("id", source_id_outer);
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
