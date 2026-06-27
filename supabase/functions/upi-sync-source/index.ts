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

const DOCUMENT_SOURCE_TYPES = new Set([
  "pdf_brochure", "excel_sheet", "csv_feed", "uploaded_email",
  "program_sheet", "brochure", "agreement", "commission_sheet", "promotion_campaign",
]);
const URL_SOURCE_TYPES = new Set([
  "website_url", "listing_page", "scholarship_page", "tuition_page",
  "international_page", "sitemap", "api_endpoint", "json_feed",
]);

function metaRecord(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

function readProcessingPolicy(source: {
  source_type?: string | null;
  document_id?: string | null;
  url?: string | null;
  metadata?: unknown;
}): "reference_only" | "ai_extract_once" | "manual_sync" {
  const stored = metaRecord(source.metadata).processing_policy;
  if (stored === "reference_only" || stored === "ai_extract_once" || stored === "manual_sync") {
    return stored;
  }
  if (source.document_id || DOCUMENT_SOURCE_TYPES.has(source.source_type ?? "")) return "ai_extract_once";
  if (URL_SOURCE_TYPES.has(source.source_type ?? "") || Boolean(source.url?.trim())) return "reference_only";
  return "manual_sync";
}

function canSyncSource(source: {
  source_type?: string | null;
  document_id?: string | null;
  url?: string | null;
  metadata?: unknown;
  last_synced_at?: string | null;
}): boolean {
  const policy = readProcessingPolicy(source);
  if (policy === "reference_only") return false;
  if (policy === "ai_extract_once") {
    const meta = metaRecord(source.metadata);
    if (meta.ai_extract_completed_at) return false;
    if (source.last_synced_at) return false;
  }
  return true;
}

function buildAiExtractCompletedPatch(source: { metadata?: unknown }): Record<string, unknown> {
  return { ...metaRecord(source.metadata), ai_extract_completed_at: new Date().toISOString() };
}

const LISTY_URL_HINTS = ["/programs", "/program/", "/courses", "/course/", "/study", "/academics", "/list", "/faculties", "/schools", "/area-of-study"];
const SKIP_URL_HINTS = ["/news", "/blog", "/events", "/about", "/contact", "/login", "/apply-now", "/staff", "/faculty-staff", "/library", "/alumni", "/giving", "/parents", "/media", "/privacy", "/terms"];

type ProgramLink = { course_title: string; program_url: string };
 type FetchResult = { md: string | null; html?: string | null; status: number; error?: string; via?: "jina" | "direct" | "firecrawl" };

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

function decodeHtml(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function htmlToText(html: string, maxChars: number): string {
  const text = decodeHtml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<\/(h[1-6]|p|div|li|tr|section|article|header|footer)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

function extractProgramLinksFromHtml(pageUrl: string, html: string): ProgramLink[] {
  const origin = new URL(pageUrl).host;
  const out: ProgramLink[] = [];
  const seen = new Set<string>();
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(anchorRe)) {
    const norm = normalizeUrl(m[1], pageUrl);
    if (!norm || shouldSkipUrl(norm, origin) || !looksListy(norm) || seen.has(norm)) continue;
    const title = htmlToText(m[2], 300).replace(/\s+/g, " ").trim();
    const pathParts = new URL(norm).pathname.split("/").filter(Boolean);
    const fallback = pathParts[pathParts.length - 1]?.replace(/[-_]+/g, " ") ?? norm;
    const course_title = title && title.length <= 120 ? title : fallback.replace(/\b\w/g, c => c.toUpperCase());
    seen.add(norm);
    out.push({ course_title, program_url: norm });
  }
  return out;
}

function hiddenValue(html: string, id: string): string | null {
  const re = new RegExp(`<input[^>]+id=["']${id}["'][^>]+value=["']([^"']+)["']`, "i");
  const match = html.match(re);
  return match ? decodeHtml(match[1]) : null;
}

async function discoverAlgoliaProgramLinks(pageUrl: string, html: string): Promise<ProgramLink[]> {
  const appId = hiddenValue(html, "Algolia_AppId");
  const apiKey = hiddenValue(html, "Algolia_ApiKey");
  const index = hiddenValue(html, "Algolia_Idx_Programs_Relevance");
  if (!appId || !apiKey || !index) return [];

  const params = new URLSearchParams();
  params.set("query", new URL(pageUrl).searchParams.get("search") ?? "");
  params.set("hitsPerPage", String(MAX_DETAIL_FETCHES));
  params.set("page", "0");
  if (/Full-Time/i.test(pageUrl)) params.set("filters", 'ProgramType:"Full-Time"');
  if (/Part-Time/i.test(pageUrl)) params.set("filters", 'ProgramType:"Part-Time"');

  const r = await fetch(`https://${appId}-dsn.algolia.net/1/indexes/${index}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Algolia-Application-Id": appId,
      "X-Algolia-API-Key": apiKey,
      Origin: new URL(pageUrl).origin,
      Referer: pageUrl,
    },
    body: JSON.stringify({ params: params.toString() }),
  });
  if (!r.ok) return [];
  const data = await r.json().catch(() => null);
  const hits = Array.isArray(data?.hits) ? data.hits : [];
  const origin = new URL(pageUrl).host;
  const seen = new Set<string>();
  const links: ProgramLink[] = [];
  for (const hit of hits) {
    const norm = normalizeUrl(String(hit?.ProgramURL ?? hit?.url ?? ""), pageUrl);
    const title = String(hit?.ProgramName ?? hit?.title ?? "").trim();
    if (!norm || !title || shouldSkipUrl(norm, origin) || seen.has(norm)) continue;
    seen.add(norm);
    links.push({ course_title: title, program_url: norm });
  }
  return links;
}

async function logMsg(
  supabase: any,
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
): Promise<FetchResult> {
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
        return { md, status: r.status, via: "jina" };
      }
      if (r.status !== 429 && r.status < 500) {
        try { await r.text(); } catch (_) { /* ignore */ }
        const msg = r.status === 402
          ? "Jina Reader credits exhausted — add or top up JINA_API_KEY"
          : `HTTP ${r.status}`;
        lastError = msg;
        break;
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
  try {
    const r = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; FutureLinkProgramSync/1.0)",
      },
    });
    const html = await r.text();
    if (r.ok && /html|text/i.test(r.headers.get("content-type") ?? "")) {
      return { md: htmlToText(html, maxChars), html, status: r.status, via: "direct", error: lastError };
    }
    const looksCloudflare = /just a moment|cf-chl|cloudflare/i.test(html ?? "");
    const directError = r.status === 403 || looksCloudflare
      ? "This site blocks automated fetch (Cloudflare)."
      : `Direct fetch HTTP ${r.status}`;
    const fc = await fetchViaFirecrawl(url, maxChars);
    if (fc.md) return { ...fc, error: lastError };
    const combined = [lastError, directError, fc.error].filter(Boolean).join("; ");
    return { md: null, html, status: r.status, error: combined, via: "direct" };
  } catch (e) {
    const directError = e instanceof Error ? e.message : String(e);
    const fc = await fetchViaFirecrawl(url, maxChars);
    if (fc.md) return { ...fc, error: lastError };
    const combined = [lastError, `direct fetch failed: ${directError}`, fc.error].filter(Boolean).join("; ");
    return { md: null, status: lastStatus, error: combined };
  }
}

async function fetchViaFirecrawl(url: string, maxChars: number): Promise<FetchResult> {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) {
    return { md: null, status: 0, error: "Firecrawl not configured (FIRECRAWL_API_KEY missing)" };
  }
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      const msg = r.status === 402
        ? "Firecrawl credits exhausted — top up at firecrawl.dev or reconnect a paid plan."
        : `Firecrawl HTTP ${r.status}: ${(data?.error ?? "").toString().slice(0, 200)}`;
      return { md: null, status: r.status, error: msg, via: "firecrawl" };
    }
    const md: string | undefined = data?.data?.markdown ?? data?.markdown;
    if (!md) return { md: null, status: r.status, error: "Firecrawl returned no markdown", via: "firecrawl" };
    return { md: md.length > maxChars ? md.slice(0, maxChars) : md, status: r.status, via: "firecrawl" };
  } catch (e) {
    return { md: null, status: 0, error: `Firecrawl request failed: ${e instanceof Error ? e.message : String(e)}`, via: "firecrawl" };
  }
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

  const supabase: any = createClient(
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
    if (!source.url && !source.document_id) {
      throw new Error("Source has no URL or linked document to process");
    }
    if (!canSyncSource(source)) {
      const policy = readProcessingPolicy(source);
      throw new Error(
        policy === "reference_only"
          ? "Processing policy is Reference Only — sync is not allowed for this source."
          : "AI Extract Once already completed for this source.",
      );
    }

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

    // If this source points at an uploaded document, route directly through
    // the document orchestrator instead of the web-crawl pipeline.
    if (source.document_id) {
      try {
        const { data: docRow } = await supabase
          .from("upi_uploaded_documents")
          .select("id, metadata")
          .eq("id", source.document_id)
          .single();
        // Priority: explicit source_type (Sources tab choice) > document's stored
        // doc_kind > legacy mime/type guess. This ensures Sources can override
        // the file's original kind (e.g. a brochure used for promotion sweeps).
        const SOURCE_TYPE_TO_KIND: Record<string, string> = {
          program_sheet: "program_sheet",
          excel_sheet: "program_sheet",
          csv_feed: "program_sheet",
          brochure: "brochure",
          pdf_brochure: "brochure",
          agreement: "agreement",
          commission_sheet: "commission_sheet",
          promotion_campaign: "promotion_campaign",
        };
        const docKind = SOURCE_TYPE_TO_KIND[source.source_type ?? ""]
          ?? (docRow?.metadata as any)?.doc_kind
          ?? "brochure";
        const { data: orchRes, error: orchErr } = await supabase.functions.invoke("upi-document-orchestrator", {
          body: { document_id: source.document_id, institution_id: source.institution_id, doc_kind: docKind },
        });
        if (orchErr) throw orchErr;
        const agg = (orchRes as any)?.result ?? {};
        const programsFound = Number(agg?.programs_found ?? 0);
        const programsUpserted = Number(agg?.programs_upserted ?? 0);
        const meta = (agg?.raw?.extraction_meta) ?? null;
        await supabase.from("upi_sync_jobs").update({
          status: "completed",
          finished_at: new Date().toISOString(),
          records_extracted: programsFound,
          records_upserted: programsUpserted,
        }).eq("id", job_id);
        await supabase.from("upi_institution_sources").update({
          crawl_status: "completed",
          last_synced_at: new Date().toISOString(),
          extracted_records_count: programsUpserted,
          pages_scanned: meta?.pagesSucceeded ?? null,
          pages_found: meta?.pageCount ?? null,
          confidence_score: Math.max(0, Math.min(100, Math.round(Number(agg?.raw?.confidence ?? 0)))),
          ...(readProcessingPolicy(source) === "ai_extract_once"
            ? { metadata: buildAiExtractCompletedPatch(source) }
            : {}),
        }).eq("id", source.id);
        return new Response(JSON.stringify({
          ok: true,
          job_id,
          via: "document",
          programs_found: programsFound,
          programs_upserted: programsUpserted,
          extraction_meta: meta,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await supabase.from("upi_sync_jobs").update({
          status: "failed", finished_at: new Date().toISOString(), error_summary: msg,
        }).eq("id", job_id);
        await supabase.from("upi_institution_sources").update({
          crawl_status: "failed",
        }).eq("id", source.id);
        return new Response(JSON.stringify({ error: msg, job_id }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

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

      async function discoverLinks(pageUrl: string, md: string, html?: string | null): Promise<ProgramLink[]> {
        const algoliaLinks = html ? await discoverAlgoliaProgramLinks(pageUrl, html).catch(() => []) : [];
        const htmlLinks = html ? extractProgramLinksFromHtml(pageUrl, html) : [];
        const deterministic = [...algoliaLinks, ...htmlLinks];
        const parsed = await callAI(
          SYSTEM_PROMPT_LIST,
          `This may be a program-list or category page. Return distinct program detail URLs only.\n\nSource URL: ${pageUrl}\n\n--- PAGE MARKDOWN ---\n${md}`,
          LINK_TOOL,
        ).catch(() => null);
        const links: { course_title: string; program_url: string }[] = Array.isArray(parsed?.programs) ? parsed.programs : [];
        const origin = new URL(pageUrl).host;
        const seen = new Set<string>();
        const out: { course_title: string; program_url: string }[] = [];
        for (const l of [...deterministic, ...links]) {
          const norm = normalizeUrl(l.program_url, pageUrl);
          if (!norm || shouldSkipUrl(norm, origin) || seen.has(norm)) continue;
          seen.add(norm);
          out.push({ course_title: l.course_title, program_url: norm });
        }
        return out;
      }

      await logMsg(supabase, job_id!, "info", `Fetching ${source.url} via Jina Reader, with direct fallback`);
      if (!Deno.env.get("JINA_API_KEY")) {
        await logMsg(supabase, job_id!, "warn", "JINA_API_KEY not set — using anonymous Jina Reader (rate-limited).");
      }
      const rootRes = await fetchMarkdown(source.url, MAX_CHARS);
      if (rootRes.error) await logMsg(supabase, job_id!, rootRes.md ? "warn" : "error", rootRes.error);
      if (!rootRes.md) throw new Error(`Fetch failed for ${source.url}: ${rootRes.error ?? rootRes.status}`);
      const rootMd = rootRes.md;
      await logMsg(supabase, job_id!, "info", `Fetched root page via ${rootRes.via ?? "unknown"} (${rootMd.length} chars)`);

      let pagesScanned = 1;
      const rootIsListy = looksListy(source.url) || ["website","program_list","sitemap","list_page"].includes(source.source_type ?? "");
      let programLinks: { course_title: string; program_url: string }[] = [];

      if (rootIsListy) {
        await logMsg(supabase, job_id!, "info", "Root URL looks listy — discovering program links");
        programLinks = await discoverLinks(source.url, rootMd, rootRes.html);
        await logMsg(supabase, job_id!, "info", `Discovered ${programLinks.length} direct program links from root`);
      }

      if (rootIsListy && programLinks.length < 3) {
        await logMsg(supabase, job_id!, "info", "Few direct programs — expanding via category pages");
        const candidateCats = await discoverLinks(source.url, rootMd, rootRes.html);
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
            return discoverLinks(cUrl, res.md, res.html).catch(() => []);
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
        ...(readProcessingPolicy(source) === "ai_extract_once"
          ? { metadata: buildAiExtractCompletedPatch(source) }
          : {}),
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