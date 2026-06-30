import { supabase } from "@/integrations/supabase/client";
import type { Master } from "@/lib/serviceLibrary";

/** Nav-only columns — omits large HTML/text blobs not used by buildAcademyNav. */
const NAV_CATALOG_SELECT =
  "id, service_category, service, sub_service, display_order, is_active, academy_metadata, service_library_countries(country)";

export type AcademyNavCatalogRow = Master & {
  service_library_countries: { country: string }[];
};

export async function fetchAcademyNavCatalog(): Promise<AcademyNavCatalogRow[]> {
  const { data, error } = await supabase
    .from("service_library")
    .select(NAV_CATALOG_SELECT)
    .eq("is_active", true)
    .order("display_order");
  if (error) throw error;
  return (data ?? []) as unknown as AcademyNavCatalogRow[];
}
