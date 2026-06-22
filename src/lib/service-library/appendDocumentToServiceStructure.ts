import { supabase } from "@/integrations/supabase/client";
import {
  mergeAcademyMetadata,
  normalizeAcademyMetadata,
  type ServiceAcademyMetadata,
} from "@/lib/service-library/academyTypes";
import {
  normalizeDocumentStructure,
  slugKey,
  type DocumentStructureDocument,
  type ServiceDocumentStructure,
} from "@/lib/service-library/documentStructure";

export async function appendDocumentToServiceStructure(opts: {
  libraryId: string;
  country?: string | null;
  sectionKey: string;
  sectionLabel: string;
  masterItemCode: string;
  label?: string;
  mandatory?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: master, error: fetchErr } = await supabase
    .from("service_library")
    .select("id, academy_metadata")
    .eq("id", opts.libraryId)
    .maybeSingle();
  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!master) return { ok: false, error: "Service Library record not found" };

  const country = opts.country?.trim() || null;
  const masterMeta = normalizeAcademyMetadata(master.academy_metadata);
  let overrideMeta: ServiceAcademyMetadata = {};
  let target: "master" | "override" = "master";
  let overrideId: string | null = null;

  if (country) {
    const { data: override } = await supabase
      .from("service_library_overrides")
      .select("id, academy_metadata")
      .eq("library_id", opts.libraryId)
      .eq("country", country)
      .maybeSingle();
    if (override?.id) {
      target = "override";
      overrideId = override.id;
      overrideMeta = normalizeAcademyMetadata(override.academy_metadata);
    }
  }

  const mergedReadMeta =
    target === "override" ? mergeAcademyMetadata(masterMeta, overrideMeta) : masterMeta;

  const existing =
    normalizeDocumentStructure(mergedReadMeta.document_structure) ??
    ({ sections: [] } as ServiceDocumentStructure);

  const sections = [...existing.sections];
  let section = sections.find((s) => s.section_key === opts.sectionKey);
  if (!section) {
    section = {
      section_key: opts.sectionKey,
      label: opts.sectionLabel,
      sort_order: (sections.length + 1) * 10,
      is_active: true,
      documents: [],
    };
    sections.push(section);
  }

  if (!section.documents.some((d) => d.master_item_code === opts.masterItemCode)) {
    const doc: DocumentStructureDocument = {
      item_key: slugKey(opts.masterItemCode),
      master_item_code: opts.masterItemCode,
      label: opts.label,
      mandatory: opts.mandatory ?? false,
      is_active: true,
      sort_order: (section.documents.length + 1) * 10,
    };
    section.documents.push(doc);
  }

  const nextStructure: ServiceDocumentStructure = {
    sections: sections.map((s) =>
      s.section_key === section!.section_key ? { ...section!, documents: [...section!.documents] } : s,
    ),
    updated_at: new Date().toISOString(),
  };

  if (target === "override" && overrideId) {
    const patch: ServiceAcademyMetadata = {
      ...overrideMeta,
      document_structure: nextStructure,
    };
    const { error } = await supabase
      .from("service_library_overrides")
      .update({ academy_metadata: patch as Record<string, unknown> })
      .eq("id", overrideId);
    if (error) return { ok: false, error: error.message };
  } else if (country) {
    const { error } = await supabase.from("service_library_overrides").insert({
      library_id: opts.libraryId,
      country,
      academy_metadata: { document_structure: nextStructure } as Record<string, unknown>,
    });
    if (error) return { ok: false, error: error.message };
  } else {
    const merged: ServiceAcademyMetadata = { ...masterMeta, document_structure: nextStructure };
    const { error } = await supabase
      .from("service_library")
      .update({ academy_metadata: merged as Record<string, unknown> })
      .eq("id", opts.libraryId);
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}
