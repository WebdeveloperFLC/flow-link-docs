import { supabase } from "@/integrations/supabase/client";

const norm = (s: string) => s.trim().toLowerCase();

function keywordTokens(...parts: (string | null | undefined)[]): string[] {
  const tokens = new Set<string>();
  for (const part of parts) {
    if (!part) continue;
    for (const raw of part.split(/[^a-zA-Z0-9]+/)) {
      const t = raw.trim().toLowerCase();
      if (t.length >= 3) tokens.add(t);
    }
  }
  return [...tokens];
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
}): Promise<{ pipelineId: string; stageId: string } | null> {
  const countries = [params.country, ...(params.interestedCountries ?? [])]
    .filter((c): c is string => !!c && c.trim().length > 0);
  if (!countries.length) return null;

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
    let best: (typeof candidates)[number] | null = null;
    let bestScore = 0;

    for (const p of candidates) {
      const haystack = `${p.name} ${p.service_category}`.toLowerCase();
      let score = 0;
      for (const n of needles) {
        if (haystack.includes(n)) score += n.length;
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