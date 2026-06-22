import { supabase } from "@/integrations/supabase/client";

export const MANUAL_ADD_SECTION_KEY = "other_documents";
export const MANUAL_ADD_SECTION_LABEL = "Other Documents";

export interface AddCaseDocumentRequirementParams {
  caseId: string;
  masterItemCode: string;
  mandatory?: boolean;
  notes?: string | null;
  sectionKey?: string;
  sectionLabel?: string;
  partyScope?: string;
  personId?: string | null;
}

/** Insert or reactivate a manual ADR row via Phase 1 RPC. */
export async function addCaseDocumentRequirement(
  params: AddCaseDocumentRequirementParams,
): Promise<{ ok: true; requirementId: string } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("fn_add_case_document_requirement", {
    p_case_id: params.caseId,
    p_master_item_code: params.masterItemCode,
    p_mandatory: params.mandatory ?? false,
    p_party_scope: params.partyScope ?? "applicant",
    p_person_id: params.personId ?? null,
    p_section_key: params.sectionKey ?? MANUAL_ADD_SECTION_KEY,
    p_section_label: params.sectionLabel ?? MANUAL_ADD_SECTION_LABEL,
    p_display_group: null,
    p_notes: params.notes ?? null,
  });

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "No requirement id returned" };
  return { ok: true, requirementId: data as string };
}
