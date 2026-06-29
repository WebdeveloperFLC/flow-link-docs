import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  OFFICIAL_PROGRAM_PAGE_CONFIDENCE,
  parseProgramPageFromUrl,
  type ParsedProgramPageFields,
} from "../_shared/programPageParser.ts";
import {
  buildStagingPatchFromEnrichment,
  type EnrichmentMergeMode,
} from "../_shared/programPageEnrichment.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FETCH_UA = "FlowLinkProgramPageBot/1.0 (+official-program-enrichment)";
const CONCURRENCY = 5;
const FETCH_TIMEOUT_MS = 12000;

type EnrichItem = {
  id?: string;
  program_url: string;
  existing?: Record<string, unknown>;
};

async function fetchHtml(url: string): Promise<{ html: string | null; error?: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": FETCH_UA },
      redirect: "follow",
    });
    if (!res.ok) return { html: null, error: `HTTP ${res.status}` };
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
      return { html: null, error: "Not an HTML page" };
    }
    const text = await res.text();
    return { html: text.slice(0, 1_500_000) };
  } catch (e) {
    return { html: null, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const items = (body?.items ?? []) as EnrichItem[];
    const mode = (body?.mode ?? "empty_only") as EnrichmentMergeMode;
    const applyToDb = body?.apply_to_db === true;

    if (!Array.isArray(items) || !items.length) {
      throw new Error("items array required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const syncedAt = new Date().toISOString();

    const results = await mapPool(items, CONCURRENCY, async (item) => {
      const url = String(item.program_url ?? "").trim();
      if (!url) {
        return { id: item.id ?? null, program_url: url, ok: false, error: "Missing program_url", fields: {} };
      }

      const { html, error: fetchError } = await fetchHtml(url);
      if (!html) {
        return {
          id: item.id ?? null,
          program_url: url,
          ok: false,
          error: fetchError ?? "Fetch failed",
          fields: {},
        };
      }

      let parsed: ParsedProgramPageFields;
      try {
        parsed = await parseProgramPageFromUrl(url, html);
      } catch (e) {
        return {
          id: item.id ?? null,
          program_url: url,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
          fields: {},
        };
      }

      const hasFields = Object.keys(parsed).some((k) => {
        if (k === "metadata") return Object.keys(parsed.metadata ?? {}).length > 0;
        const v = parsed[k as keyof ParsedProgramPageFields];
        return v != null && v !== "";
      });

      let patch: Record<string, unknown> | null = null;
      if (item.existing) {
        const stagingRow = { ...item.existing, id: item.id ?? "temp" } as Record<string, unknown>;
        const built = buildStagingPatchFromEnrichment(
          stagingRow as never,
          parsed,
          mode,
          syncedAt,
        );
        patch = built as Record<string, unknown> | null;
      }

      if (applyToDb && item.id && patch && Object.keys(patch).length) {
        const { error } = await supabase.from("upi_courses_staging").update(patch).eq("id", item.id);
        if (error) {
          return {
            id: item.id,
            program_url: url,
            ok: false,
            error: error.message,
            fields: parsed,
          };
        }
      }

      return {
        id: item.id ?? null,
        program_url: url,
        ok: true,
        has_fields: hasFields,
        fields: parsed,
        patch,
        synced_at: syncedAt,
        confidence_score: OFFICIAL_PROGRAM_PAGE_CONFIDENCE,
      };
    });

    const updated = results.filter((r) => r.ok && r.patch && Object.keys(r.patch).length).length;
    const failed = results.filter((r) => !r.ok).length;

    return new Response(
      JSON.stringify({ ok: true, updated, failed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
