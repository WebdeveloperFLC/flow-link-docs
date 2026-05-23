import { supabase } from "@/integrations/supabase/client";

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
}): Promise<{ pipelineId: string; stageId: string } | null> {
  const { clientId } = params;
  const countries = [params.country, ...(params.interestedCountries ?? [])]
    .filter((c): c is string => !!c && c.trim().length > 0);
  const category = (params.serviceCategory ?? "").trim();
  if (!countries.length || !category) return null;

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