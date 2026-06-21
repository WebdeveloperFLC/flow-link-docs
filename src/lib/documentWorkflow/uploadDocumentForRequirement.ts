import { supabase } from "@/integrations/supabase/client";
import { buildClassifiedDocumentName, countStemCollisions } from "@/lib/constants";
import { processToPdf } from "@/lib/processFile";
import { resolveSectionIdByKey, type CaseSection } from "@/lib/sections";
import type { EnrichedRequirement } from "./buildEnrichedRequirements";

export async function uploadDocumentForRequirement(params: {
  clientId: string;
  caseId: string | null;
  requirement: EnrichedRequirement;
  file: File;
  sections: CaseSection[];
  displayLabel: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { clientId, caseId, requirement, file, sections, displayLabel } = params;
  const sectionId =
    resolveSectionIdByKey(requirement.section_key, sections) ??
    sections.find((s) => s.key === "other")?.id ??
    null;

  const { data: priorDocs } = await supabase
    .from("client_documents")
    .select("file_name, master_item_code, version")
    .eq("client_id", clientId)
    .is("deleted_at", null);

  const priorNames = (priorDocs ?? []).map((d) => d.file_name ?? "");
  const classifiedStem = buildClassifiedDocumentName(displayLabel, file.name, 1);
  const collisions = countStemCollisions(priorNames, classifiedStem);
  const baseName = buildClassifiedDocumentName(displayLabel, file.name, collisions + 1);

  let processed: File;
  try {
    processed = await processToPdf(file, baseName);
  } catch {
    processed = file;
  }

  const path = `${clientId}/section/${requirement.section_key}/${Date.now()}_${processed.name}`;
  const { error: upErr } = await supabase.storage
    .from("client-documents")
    .upload(path, processed, { contentType: processed.type || "application/pdf" });
  if (upErr) return { ok: false, error: upErr.message };

  const matchKey = requirement.master_item_code;
  const related = (priorDocs ?? []).filter(
    (d) =>
      (d as { master_item_code?: string }).master_item_code === matchKey ||
      false,
  );
  const maxVersion = related.reduce(
    (m, d) => Math.max(m, (d as { version?: number }).version ?? 0),
    0,
  );
  const nextVersion = maxVersion + 1;

  await supabase
    .from("client_documents")
    .update({ is_active_version: false } as never)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .eq("master_item_code", matchKey);

  const { data: user } = await supabase.auth.getUser();
  const { error: insErr } = await supabase.from("client_documents").insert({
    client_id: clientId,
    case_id: caseId,
    section_id: sectionId,
    document_type: displayLabel,
    custom_type: displayLabel,
    master_item_code: matchKey,
    file_name: processed.name,
    storage_path: path,
    mime_type: processed.type || "application/pdf",
    size_bytes: processed.size,
    version: nextVersion,
    status: "uploaded",
    is_active_version: true,
    uploaded_by: user.user?.id ?? null,
  } as never);

  if (insErr) return { ok: false, error: insErr.message };
  return { ok: true };
}
