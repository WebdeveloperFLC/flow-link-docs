import { supabase } from "@/integrations/supabase/client";
import {
  mergeAcademyMetadata,
  normalizeAcademyMetadata,
} from "@/lib/service-library/academyTypes";
import {
  resolveDocumentStructure,
  type ServiceDocumentStructure,
} from "@/lib/service-library/documentStructure";

/** Load merged document_structure for a Service Library record (+ country override). */
export async function fetchServiceDocumentStructure(
  libraryId: string,
  country?: string | null,
): Promise<ServiceDocumentStructure | null> {
  const { data: master, error } = await supabase
    .from("service_library")
    .select("academy_metadata")
    .eq("id", libraryId)
    .maybeSingle();
  if (error) throw error;

  let meta = normalizeAcademyMetadata(master?.academy_metadata);

  if (country?.trim()) {
    const { data: override } = await supabase
      .from("service_library_overrides")
      .select("academy_metadata")
      .eq("library_id", libraryId)
      .eq("country", country.trim())
      .maybeSingle();
    if (override?.academy_metadata) {
      meta = mergeAcademyMetadata(meta, normalizeAcademyMetadata(override.academy_metadata));
    }
  }

  return resolveDocumentStructure(meta);
}
