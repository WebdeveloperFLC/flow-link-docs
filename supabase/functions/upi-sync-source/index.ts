import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_CHARS = 80_000;
const MAX_DETAIL_FETCHES = 200;
const MAX_CATEGORY_FETCHES = 20;
const CONCURRENCY = 3;
const FETCH_RETRIES = 3;
const BATCH_PAUSE_MS = 150;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const LISTY_URL_HINTS = ["/programs", "/program/", "/courses", "/course/", "/study", "/academics", "/list", "/faculties", "/schools", "/area-of-study"];
const SKIP_URL_HINTS = ["/news", "/blog", "/events", "/about", "/contact", "/login", "/apply-now", "/staff", "/faculty-staff", "/library", "/alumni", "/giving", "/parents", "/media", "/privacy", "/terms"];

const LINK_TOOL = {
  type: "function",
  function: {
    name: "extract_program_links",
    description: "From a program-list or category page, return distinct academic program names and their detail page URLs. Ignore navigation, news, blog, staff, or generic info pages.",
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
    description: "Extract every distinct course/program found on the page. Be thorough but only include real academic programs. Leave fields null if not present — never invent.",
    parameters: {
      type: "object",
      properties: {
        courses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              course_title: { type: "string" },
              program_level: { type: "string" },
              field_of_study: { type: "string" },
              specialization: { type: "string" },
              duration_value: { type: "number" },
              duration_unit: { type: "string" },
              tuition_fee: { type: "number" },
              currency: { type: "string" },
              intake_months: { type: "array", items: { type: "string" } },
              ielts_overall: { type: "number" },
              pte_overall: { type: "number" },
              toefl_overall: { type: "number" },
              gpa_requirement: { type: "string" },
              is_pgwp_eligible: { type: "boolean" },
              is_coop: { type: "boolean" },
              campus_name: { type: "string" },
              course_description: { type: "string" },
              confidence_score: { type: "number" },
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

async function fetchMarkdown(
  url: string,
  maxChars: number,
): Promise<{ md: string | null; status: number; error?: string }> {
  const jinaKey = Deno.env.get("JINA_API_KEY");
  const headers: Record<string, string> = {
    Accept: "text/markdown",
    "X-Return-Format": "markdown",
    "Content-Type": "application/json",
  };
  if (jinaKey) headers["Authorization"] = `Bearer ${jinaKey}`;
  let lastStatus = 0;
  let lastError: string | undefined;
  for (let attempt = 0; attempt < FETCH_RETRIES; attempt++) {
    try {
      // POST endpoint avoids URL-encoding issues when the target URL contains
      // complex query strings (e.g. `?filter[ProgramType][0]=…`).
      const r = await fetch("https://r.jina.ai/", {
        method: "POST",
        headers,
        body: JSON.stringify({ url }),
      });
      lastStatus = r.status;
      if (r.ok) {
        let md = await r.text();
        if (md.length > maxChars) md = md.slice(0, maxChars);
        return { md, status: r.status };
      }
      if (r.status !== 429 && r.status < 500) {
        try { await r.text(); } catch (_) { /* ignore */ }
        const msg = r.status === 402
          ? "Jina Reader credits exhausted — add or top up JINA_API_KEY"
          : `HTTP ${r.status}`;
        return { md: null, status: r.status, error: msg };
      }
      const retryAfter = parseInt(r.headers.get("retry-after") ?? "", 10);
      try { await r.text(); } catch (_) { /* ignore */ }
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(7000, 1000 * Math.pow(2, attempt));
      await sleep(backoff);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      await sleep(Math.min(7000, 1000 * Math.pow(2, attempt)));
    }
  }
  return { md: null, status: lastStatus, error: lastError ?? `HTTP ${lastStatus}` };
}

function triggerBatch(job_id: string) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/upi-sync-process-batch`;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  // fire-and-forget
  const p = fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ job_id }),
  }).catch(() => { /* ignore */ });
  // @ts-ignore
  if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(p);
  }
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
      const SYSTEM_PROMPT_LIST =
        "You extract academic course/program data from university web pages. Return strict structured output. Never invent numeric fields.";

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
      if (!Deno.env.get("JINA_API_KEY")) {
        await logMsg(supabase, job_id!, "warn", "JINA_API_KEY not set — using anonymous Jina Reader (rate-limited).");
      }
      const rootRes = await fetchMarkdown(source.url, MAX_CHARS);
      if (!rootRes.md) throw new Error(`Jina fetch failed for ${source.url}: ${rootRes.error ?? rootRes.status}`);
      const rootMd = rootRes.md;
      await logMsg(supabase, job_id!, "info", `Fetched root page (${rootMd.length} chars)`);

      let pagesScanned = 1;
      const rootIsListy = looksListy(source.url) || ["website","program_list","sitemap","list_page"].includes(source.source_type ?? "");
      let programLinks: { course_title: string; program_url: string }[] = [];

      if (rootIsListy) {
        await logMsg(supabase, job_id!, "info", "Root URL looks listy — discovering program links");
        programLinks = await discoverLinks(source.url, rootMd);
        await logMsg(supabase, job_id!, "info", `Discovered ${programLinks.length} direct program links from root`);
      }

      if (rootIsListy && programLinks.length < 3) {
        await logMsg(supabase, job_id!, "info", "Few direct programs — expanding via category pages");
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
            const res = await fetchMarkdown(cUrl, MAX_CHARS);
            if (!res.md) return [];
            pagesScanned++;
            return discoverLinks(cUrl, res.md).catch(() => []);
          }));
          for (const arr of results) programLinks.push(...arr);
          await sleep(BATCH_PAUSE_MS);
        }
        const seen = new Set<string>();
        programLinks = programLinks.filter(l => {
          if (seen.has(l.program_url)) return false;
          seen.add(l.program_url); return true;
        });
        await logMsg(supabase, job_id!, "info", `After category expansion: ${programLinks.length} program links`);
      }

      // Queue or fallback
      if (programLinks.length >= 3) {
        const toQueue = programLinks.slice(0, MAX_DETAIL_FETCHES).map(l => ({
          job_id: job_id!,
          source_id: source.id,
          institution_id: source.institution_id,
          program_url: l.program_url,
          course_title: l.course_title,
          status: "pending",
        }));
        // chunk inserts (avoid huge single insert)
        const CHUNK = 100;
        for (let i = 0; i < toQueue.length; i += CHUNK) {
          const slice = toQueue.slice(i, i + CHUNK);
          const { error } = await supabase.from("upi_sync_queue")
            .upsert(slice, { onConflict: "job_id,program_url", ignoreDuplicates: true });
          if (error) await logMsg(supabase, job_id!, "error", `Queue insert failed: ${error.message}`);
        }
        await supabase.from("upi_sync_jobs").update({
          pages_discovered: programLinks.length,
          pages_scanned: pagesScanned,
        }).eq("id", job_id!);
        await logMsg(supabase, job_id!, "info", `Queued ${toQueue.length} program detail pages — starting batch worker`);
        triggerBatch(job_id!);
        return;
      }

      // Fallback: tiny single-page extraction (kept inline)
      await logMsg(supabase, job_id!, "info", "Falling back to single-page extraction");
      const parsed = await callAI(
        SYSTEM_PROMPT_LIST,
        `Source URL: ${source.url}\nSource type: ${source.source_type}\n\n--- PAGE MARKDOWN ---\n${rootMd}`,
        COURSE_TOOL,
      );
      const courses: unknown[] = Array.isArray(parsed?.courses) ? parsed.courses : [];
      let upserted = 0, rejected = 0;
      if (courses.length > 0) {
        const enriched = courses.map((c) => {
          const o = c as Record<string, unknown>;
          if (!o.source_url) o.source_url = source.url;
          if (o.confidence_score == null) o.confidence_score = 50;
          return o;
        });
        const { data: upRes } = await supabase.functions.invoke("upi-upsert-courses", {
          body: { courses: enriched, job_id, institution_id: source.institution_id, source_id: source.id },
        });
        upserted = (upRes as any)?.upserted ?? 0;
        rejected = (upRes as any)?.rejected ?? 0;
      }
      await supabase.from("upi_sync_jobs").update({
        status: "completed",
        pages_scanned: pagesScanned, pages_discovered: pagesScanned,
        completed_at: new Date().toISOString(),
      }).eq("id", job_id!);
      await supabase.from("upi_institution_sources").update({
        crawl_status: "completed", last_synced_at: new Date().toISOString(),
        pages_scanned: pagesScanned, pages_found: pagesScanned,
        extracted_records_count: upserted,
      }).eq("id", source.id);
      await logMsg(supabase, job_id!, "info", `Fallback upserted ${upserted}, rejected ${rejected}`);
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
      JSON.stringify({ ok: true, job_id, status: "running" }),
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