import { supabase } from "@/integrations/supabase/client";
import { LIBRARY_PIPELINE_SEED_SLUG } from "@/lib/stagePipelineLibrarySlug";

const norm = (s: string) => s.trim().toLowerCase();

/** Generic words that cause false ties (e.g. PGWP vs BOWP both match "work permit"). */
const PIPELINE_MATCH_STOPWORDS = new Set([
  "canada", "work", "permit", "visa", "student", "immigration", "application", "services",
  "united", "kingdom", "states", "australia", "germany", "record", "extension", "dependent",
]);

function keywordTokens(...parts: (string | null | undefined)[]): string[] {
  const tokens = new Set<string>();
  for (const part of parts) {
    if (!part) continue;
    for (const raw of part.split(/[^a-zA-Z0-9]+/)) {
      const t = raw.trim().toLowerCase();
      if (t.length < 3 || PIPELINE_MATCH_STOPWORDS.has(t)) continue;
      tokens.add(t);
    }
  }
  return [...tokens];
}

async function resolvePipelineByLibrarySeed(
  libraryId: string,
  country: string,
): Promise<{ pipelineId: string; stageId: string } | null> {
  const slug = LIBRARY_PIPELINE_SEED_SLUG[libraryId];
  if (!slug) return null;

  const { data: pipeline } = await supabase
    .from("stage_pipelines")
    .select("id")
    .eq("country", country)
    .eq("is_active", true)
    .ilike("description", `%${slug}%`)
    .maybeSingle();
  if (!pipeline) return null;

  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("pipeline_id", pipeline.id)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!stage) return null;

  return { pipelineId: pipeline.id, stageId: stage.id };
}

/**
 * Find the best-matching stage pipeline for a Service Library service.
 * Scores pipeline name + service_category against sub_service and display title.
 */
export async function resolvePipelineForServiceLibrary(params: {
  country?: string | null;
  interestedCountries?: string[] | null;
  serviceTitle: string;
  subService: string;
  libraryId?: string | null;
  distinctiveTokens?: string[];
}): Promise<{ pipelineId: string; stageId: string } | null> {
  const countries = [params.country, ...(params.interestedCountries ?? [])]
    .filter((c): c is string => !!c && c.trim().length > 0);
  if (!countries.length) return null;

  const primaryCountry = countries[0]!;
  if (params.libraryId) {
    const direct = await resolvePipelineByLibrarySeed(params.libraryId, primaryCountry);
    if (direct) return direct;
  }

  try {
    const { data: pipelines } = await supabase
      .from("stage_pipelines")
      .select("id, name, country, service_category")
      .eq("is_active", true);
    if (!pipelines?.length) return null;

    const wanted = countries.map(norm);
    const candidates = pipelines.filter((p) => wanted.includes(norm(p.country)));
    if (!candidates.length) return null;

    const needles = keywordTokens(params.subService, params.serviceTitle);
    const distinctive = (params.distinctiveTokens ?? [])
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length >= 2);
    let best: (typeof candidates)[number] | null = null;
    let bestScore = 0;

    for (const p of candidates) {
      const haystack = `${p.name} ${p.service_category}`.toLowerCase();
      let score = 0;
      for (const n of needles) {
        if (haystack.includes(n)) score += n.length;
        else if (n === "student" && haystack.includes("study")) score += 5;
        else if (n === "spouse" && haystack.includes("spous")) score += 5;
      }
      for (const d of distinctive) {
        if (haystack.includes(d)) score += d.length * 8;
      }
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }

    if (!best || bestScore === 0) return null;

    const { data: stage } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("pipeline_id", best.id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!stage) return null;

    return { pipelineId: best.id, stageId: stage.id };
  } catch (e) {
    console.warn("[resolvePipelineForServiceLibrary] unexpected error", e);
    return null;
  }
}

/**
 * Best-effort auto-assignment of a stage pipeline to a freshly created client.
 * Matches client country + chosen service category against `stage_pipelines`
 * (case-insensitive) and sets `pipeline_id` + `current_stage_id` to the first
 * stage (sort_order = 1). Silently skips when no pipeline matches.
 */
export async function autoAssignPipelineForClient(params: {
  clientId: string;
  country?: string | null;
  interestedCountries?: string[] | null;
  serviceCategory?: string | null;
  /** When set, treated as a service_library code — resolved via keyword match, not exact category. */
  serviceCode?: string | null;
  serviceTitle?: string | null;
  subService?: string | null;
}): Promise<{ pipelineId: string; stageId: string } | null> {
  const { clientId } = params;
  const countries = [params.country, ...(params.interestedCountries ?? [])]
    .filter((c): c is string => !!c && c.trim().length > 0);
  const category = (params.serviceCategory ?? "").trim();
  if (!countries.length) return null;

  if (params.serviceTitle && params.subService) {
    const fromLibrary = await resolvePipelineForServiceLibrary({
      country: params.country,
      interestedCountries: params.interestedCountries,
      serviceTitle: params.serviceTitle,
      subService: params.subService,
    });
    if (fromLibrary) {
      const { error } = await supabase
        .from("clients")
        .update({ pipeline_id: fromLibrary.pipelineId, current_stage_id: fromLibrary.stageId })
        .eq("id", clientId);
      if (error) {
        console.warn("[autoAssignPipeline] update failed", error);
        return null;
      }
      return fromLibrary;
    }
  }

  if (!category || category.includes("::")) return null;

  try {
    const { data: pipelines } = await supabase
      .from("stage_pipelines")
      .select("id, country, service_category")
      .eq("is_active", true);
    if (!pipelines?.length) return null;

    const norm = (s: string) => s.trim().toLowerCase();
    const wanted = countries.map(norm);
    const match = pipelines.find(
      (p) => wanted.includes(norm(p.country)) && norm(p.service_category) === norm(category),
    );
    if (!match) return null;

    const { data: stage } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("pipeline_id", match.id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!stage) return null;

    const { error } = await supabase
      .from("clients")
      .update({ pipeline_id: match.id, current_stage_id: stage.id })
      .eq("id", clientId);
    if (error) {
      console.warn("[autoAssignPipeline] update failed", error);
      return null;
    }
    return { pipelineId: match.id, stageId: stage.id };
  } catch (e) {
    console.warn("[autoAssignPipeline] unexpected error", e);
    return null;
  }
}