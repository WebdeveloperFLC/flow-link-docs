import { supabase } from "@/integrations/supabase/client";
import { groupForType } from "@/lib/binderGroups";
import { PROFILE_FIELDS, type ProfileField } from "@/lib/extractedFields";

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
  experience: ["work_experience", "experience"],
  financial: ["financial", "finance"],
  forms: ["forms"],
  family: ["family"],
  supporting: ["supporting", "institutional"],
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

/** Create a new custom section. Returns the inserted row. */
export async function createSection(label: string): Promise<CaseSection | null> {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const baseKey = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40) || `section_${Date.now()}`;
  // Ensure uniqueness
  const { data: existing } = await supabase
    .from("case_sections")
    .select("key")
    .ilike("key", `${baseKey}%`);
  const taken = new Set((existing ?? []).map((r) => (r as { key: string }).key));
  let key = baseKey;
  let n = 2;
  while (taken.has(key)) { key = `${baseKey}_${n}`; n++; }
  // Place at the end
  const { data: maxRow } = await supabase
    .from("case_sections")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = ((maxRow?.sort_order as number | undefined) ?? 0) + 10;
  const { data, error } = await supabase
    .from("case_sections")
    .insert({ key, label: trimmed, sort_order, is_default: false } as never)
    .select()
    .single();
  if (error) return null;
  cachedSections = null; // force reload
  return data as CaseSection;
}

/**
 * Field whitelist owned by each section. The extractor's results are filtered
 * to this whitelist so a document uploaded into "Identity" can only auto-fill
 * Identity fields, "Finance" can only auto-fill Finance fields, etc.
 *
 * The whitelist is keyed by the section.key. Unknown / custom sections fall
 * back to allowing nothing (so a document never silently writes elsewhere).
 * The "additional"/"other"/"supporting" buckets allow the full set so they
 * remain a useful catch-all for misclassified docs.
 */
const SECTION_FIELD_MAP: Record<string, ProfileField[]> = {
  identity: [
    "date_of_birth", "gender", "nationality", "place_of_birth",
    "passport_number", "passport_issue_date", "passport_expiry", "passport_country",
    "marital_status", "spouse_name",
    "address_line1", "address_city", "address_state", "address_country", "address_postal",
    "phone_alt", "email_alt",
    "emergency_contact_name", "emergency_contact_phone",
  ],
  academic: [
    "highest_qualification", "institution_name", "graduation_year", "gpa_or_percentage",
    "ielts_overall", "ielts_listening", "ielts_reading", "ielts_writing", "ielts_speaking", "ielts_test_date",
  ],
  academics: [
    "highest_qualification", "institution_name", "graduation_year", "gpa_or_percentage",
    "ielts_overall", "ielts_listening", "ielts_reading", "ielts_writing", "ielts_speaking", "ielts_test_date",
  ],
  experience: ["employer_name", "job_title", "annual_income", "currency"],
  work_experience: ["employer_name", "job_title", "annual_income", "currency"],
  financial: ["bank_name", "account_balance", "gic_amount", "tuition_paid", "annual_income", "currency"],
  finance: ["bank_name", "account_balance", "gic_amount", "tuition_paid", "annual_income", "currency"],
  forms: [],
  family: ["spouse_name", "marital_status"],
  institutional: ["institution_name"],
  supporting: [...PROFILE_FIELDS],
  other: [...PROFILE_FIELDS],
  additional: [...PROFILE_FIELDS],
};

/** Whether a section also owns the education-history list (separate table). */
const SECTION_OWNS_EDUCATION = new Set(["academic", "academics", "institutional"]);

export function fieldsForSection(sectionKey: string | null | undefined): {
  fields: ProfileField[];
  ownsEducation: boolean;
} {
  const key = sectionKey ?? "";
  return {
    fields: SECTION_FIELD_MAP[key] ?? [],
    ownsEducation: SECTION_OWNS_EDUCATION.has(key),
  };
}

/** Filter raw extractor output down to the fields this section is allowed to fill. */
export function filterExtractedForSection<T extends Record<string, unknown>>(
  sectionKey: string | null | undefined,
  fields: T,
): T {
  const { fields: allow, ownsEducation } = fieldsForSection(sectionKey);
  const allowSet = new Set<string>(allow);
  if (ownsEducation) allowSet.add("education_history");
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields ?? {})) {
    if (allowSet.has(k)) out[k] = v;
  }
  return out as T;
}