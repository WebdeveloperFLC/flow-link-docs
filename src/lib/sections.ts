import { supabase } from "@/integrations/supabase/client";
import { groupForType } from "@/lib/binderGroups";

export interface CaseSection {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_default: boolean;
  is_archived: boolean;
}

/** Map a binderGroups key to one of the seeded case_sections.key values.
 *  Multiple keys are tried in order — the first that exists in the DB wins. */
const GROUP_TO_SECTION: Record<string, string[]> = {
  identity: ["identity"],
  academic: ["academic", "academics"],
  experience: ["experience"],
  financial: ["financial", "finance"],
  forms: ["forms"],
  family: ["family"],
  supporting: ["supporting"],
  other: ["other", "additional"],
};

let cachedSections: CaseSection[] | null = null;

export async function loadSections(force = false): Promise<CaseSection[]> {
  if (!force && cachedSections) return cachedSections;
  const { data } = await supabase
    .from("case_sections")
    .select("*")
    .eq("is_archived", false)
    .order("sort_order", { ascending: true });
  cachedSections = (data ?? []) as CaseSection[];
  return cachedSections;
}

/** Best-guess section_id for a given document_type/custom_type. Falls back to "additional". */
export async function inferSectionId(typeName: string): Promise<string | null> {
  const sections = await loadSections();
  const groupKey = groupForType(typeName).key;
  const candidates = GROUP_TO_SECTION[groupKey] ?? ["additional", "other"];
  for (const key of candidates) {
    const hit = sections.find((s) => s.key === key);
    if (hit) return hit.id;
  }
  // Final fallbacks
  const fb = sections.find((s) => s.key === "additional") ?? sections.find((s) => s.key === "other");
  return fb?.id ?? null;
}

/** Persist a new ordering for documents inside one section. */
export async function saveSectionOrder(docIds: string[]): Promise<void> {
  await Promise.all(
    docIds.map((id, i) =>
      supabase.from("client_documents").update({ section_order: (i + 1) * 10 }).eq("id", id)
    )
  );
}

export async function getSectionOrderMode(clientId: string, sectionId: string): Promise<"auto" | "manual"> {
  const { data } = await supabase
    .from("client_section_settings")
    .select("order_mode")
    .eq("client_id", clientId)
    .eq("section_id", sectionId)
    .maybeSingle();
  return (data?.order_mode as "auto" | "manual") ?? "auto";
}

export async function setSectionOrderMode(clientId: string, sectionId: string, mode: "auto" | "manual"): Promise<void> {
  const { data: existing } = await supabase
    .from("client_section_settings")
    .select("id")
    .eq("client_id", clientId)
    .eq("section_id", sectionId)
    .maybeSingle();
  if (existing?.id) {
    await supabase.from("client_section_settings").update({ order_mode: mode }).eq("id", existing.id);
  } else {
    await supabase.from("client_section_settings").insert({
      client_id: clientId, section_id: sectionId, order_mode: mode,
    });
  }
}