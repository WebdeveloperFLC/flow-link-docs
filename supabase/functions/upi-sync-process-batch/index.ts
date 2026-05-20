import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BATCH_SIZE = 8;
const CONCURRENCY = 3;
const FETCH_RETRIES = 3;
const BATCH_PAUSE_MS = 150;
const DETAIL_MAX_CHARS = 40_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type FetchResult = { md: string | null; status: number; error?: string; via?: "jina" | "direct" };

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

const COURSE_TOOL = {
  type: "function",
  function: {
    name: "extract_courses",
    description: "Extract academic program data from a SINGLE program's detail page. Emit exactly one course row unless multiple campuses/delivery modes are clearly listed. Never invent fees, IELTS, durations.",
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

async function fetchMarkdown(url: string, maxChars: number): Promise<FetchResult> {
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
      // POST endpoint avoids URL-encoding issues when the target URL itself
      // contains complex query strings (e.g. `?filter[ProgramType][0]=…`).
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
        try { await r.text(); } catch (_) {/* */}
        const msg = r.status === 402
          ? "Jina Reader credits exhausted — add or top up JINA_API_KEY"
          : `HTTP ${r.status}`;
        lastError = msg;
        break;
      }
      const retryAfter = parseInt(r.headers.get("retry-after") ?? "", 10);
      try { await r.text(); } catch (_) {/* */}
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
      return { md: htmlToText(html, maxChars), status: r.status, via: "direct", error: lastError };
    }
    const directError = r.status === 403 ? "Site blocks automated fetch (HTTP 403)" : `Direct fetch HTTP ${r.status}`;
    return { md: null, status: r.status, error: lastError ? `${lastError}; ${directError}` : directError, via: "direct" };
  } catch (e) {
    const directError = e instanceof Error ? e.message : String(e);
    return { md: null, status: lastStatus, error: lastError ? `${lastError}; direct fetch failed: ${directError}` : directError };
  }
}

function chainNext(job_id: string) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/upi-sync-process-batch`;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const p = fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
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

  try {
    const { job_id } = await req.json();
    if (!job_id) throw new Error("job_id is required");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Claim a batch of pending rows for this job
    const { data: pending, error: claimErr } = await supabase
      .from("upi_sync_queue")
      .select("id, program_url, course_title, source_id, institution_id, attempts")
      .eq("job_id", job_id).eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);
    if (claimErr) throw claimErr;

    const rows = pending ?? [];
    if (rows.length === 0) {
      // No work — try to finalize if job still running
      await finalizeIfDone(supabase, job_id);
      return new Response(JSON.stringify({ ok: true, processed: 0, done: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ids = rows.map(r => r.id);
    await supabase.from("upi_sync_queue").update({
      status: "processing", updated_at: new Date().toISOString(),
    }).in("id", ids);

    // Process with limited concurrency
    const collected: Record<string, unknown>[] = [];
    const completedIds: string[] = [];
    const failed: { id: string; err: string }[] = [];

    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const slice = rows.slice(i, i + CONCURRENCY);
      await Promise.all(slice.map(async (row) => {
        try {
          const res = await fetchMarkdown(row.program_url as string, DETAIL_MAX_CHARS);
          if (!res.md) {
            // emit low-confidence stub so the program still appears
            collected.push({
              course_title: row.course_title,
              program_url: row.program_url,
              source_url: row.program_url,
              confidence_score: 30,
            });
            failed.push({ id: row.id as string, err: res.error ?? `HTTP ${res.status}` });
            return;
          }
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: "Extract academic program data from this detail page. One row per distinct program/campus. Never invent fees, IELTS, durations." },
                { role: "user", content: `Program: ${row.course_title}\nDetail URL: ${row.program_url}\n\n--- PAGE MARKDOWN ---\n${res.md}` },
              ],
              tools: [COURSE_TOOL],
              tool_choice: { type: "function", function: { name: "extract_courses" } },
            }),
          });
          if (!aiRes.ok) {
            const t = await aiRes.text();
            throw new Error(`AI ${aiRes.status}: ${t.slice(0, 200)}`);
          }
          const j = await aiRes.json();
          const args = j?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          const parsed = args ? JSON.parse(args) : null;
          const items: unknown[] = Array.isArray(parsed?.courses) ? parsed.courses : [];
          for (const it of items) {
            const o = it as Record<string, unknown>;
            if (!o.program_url) o.program_url = row.program_url;
            o.source_url = row.program_url;
            if (!o.course_title) o.course_title = row.course_title;
            collected.push(o);
          }
          completedIds.push(row.id as string);
        } catch (e) {
          // stub + mark failed
          collected.push({
            course_title: row.course_title,
            program_url: row.program_url,
            source_url: row.program_url,
            confidence_score: 25,
          });
          failed.push({ id: row.id as string, err: e instanceof Error ? e.message : String(e) });
        }
      }));
      await sleep(BATCH_PAUSE_MS);
    }

    // Upsert
    let upserted = 0;
    if (collected.length > 0) {
      // enrich confidence
      const numericKeys = ["tuition_fee","ielts_overall","pte_overall","toefl_overall","duration_value"];
      const enriched = collected.map((o) => {
        const filled = numericKeys.filter(k => o[k] != null).length
          + (Array.isArray(o.intake_months) && (o.intake_months as unknown[]).length > 0 ? 1 : 0);
        if (o.confidence_score == null || typeof o.confidence_score !== "number" || o.confidence_score === 0) {
          o.confidence_score = filled === 0 ? 40 : Math.min(95, 50 + filled * 8);
        }
        return o;
      });
      const sourceId = rows[0].source_id;
      const institutionId = rows[0].institution_id;
      const { data: upRes } = await supabase.functions.invoke("upi-upsert-courses", {
        body: { courses: enriched, job_id, institution_id: institutionId, source_id: sourceId },
      });
      upserted = (upRes as any)?.upserted ?? 0;
    }

    // Mark queue rows
    if (completedIds.length > 0) {
      await supabase.from("upi_sync_queue").update({
        status: "done", updated_at: new Date().toISOString(),
      }).in("id", completedIds);
    }
    for (const f of failed) {
      await supabase.from("upi_sync_queue").update({
        status: "failed",
        last_error: f.err.slice(0, 500),
        attempts: (rows.find(r => r.id === f.id)?.attempts as number ?? 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq("id", f.id);
    }

    // Bump job counters
    const { data: job } = await supabase.from("upi_sync_jobs")
      .select("pages_scanned, records_upserted").eq("id", job_id).single();
    await supabase.from("upi_sync_jobs").update({
      pages_scanned: ((job?.pages_scanned as number) ?? 0) + rows.length,
      records_upserted: ((job?.records_upserted as number) ?? 0) + upserted,
    }).eq("id", job_id);

    await logMsg(supabase, job_id, "info",
      `Batch processed: ${rows.length} pages, ${upserted} upserted, ${failed.length} failed`);

    // Chain next batch or finalize
    const { count: remaining } = await supabase.from("upi_sync_queue")
      .select("id", { count: "exact", head: true })
      .eq("job_id", job_id).eq("status", "pending");
    if ((remaining ?? 0) > 0) {
      chainNext(job_id);
      return new Response(JSON.stringify({ ok: true, processed: rows.length, remaining }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 202,
      });
    }
    await finalizeIfDone(supabase, job_id);
    return new Response(JSON.stringify({ ok: true, processed: rows.length, done: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function finalizeIfDone(supabase: any, job_id: string) {
  const { count: pendingOrProcessing } = await supabase.from("upi_sync_queue")
    .select("id", { count: "exact", head: true })
    .eq("job_id", job_id).in("status", ["pending", "processing"]);
  if ((pendingOrProcessing ?? 0) > 0) return;

  const { data: job } = await supabase.from("upi_sync_jobs")
    .select("status, source_id, records_upserted, pages_scanned").eq("id", job_id).single();
  if (!job || job.status !== "running") return;

  const { count: failedCount } = await supabase.from("upi_sync_queue")
    .select("id", { count: "exact", head: true })
    .eq("job_id", job_id).eq("status", "failed");

  const finalStatus = (failedCount ?? 0) > 0 ? "completed_with_errors" : "completed";
  await supabase.from("upi_sync_jobs").update({
    status: finalStatus, completed_at: new Date().toISOString(),
  }).eq("id", job_id);

  if (job.source_id) {
    await supabase.from("upi_institution_sources").update({
      crawl_status: "completed",
      last_synced_at: new Date().toISOString(),
      pages_scanned: job.pages_scanned ?? 0,
      extracted_records_count: job.records_upserted ?? 0,
    }).eq("id", job.source_id);
  }
  await logMsg(supabase, job_id, "info", `Sync finalized: ${finalStatus}`);
}