import { supabase } from "@/integrations/supabase/client";
import type { Template } from "@/pages/Templates";
import { buildServiceCode } from "./serviceCodes";

/** Resolve workflow_templates rows linked to a service_library record via category string. */
export function serviceCodesForTemplateMatch(libraryId: string, country: string | null | undefined): string[] {
  const code = buildServiceCode(libraryId, country);
  const bare = libraryId;
  return code === bare ? [bare] : [code, bare];
}

export async function fetchWorkflowTemplatesForService(
  libraryId: string,
  country: string | null | undefined,
): Promise<Template[]> {
  const codes = serviceCodesForTemplateMatch(libraryId, country);
  const { data, error } = await supabase
    .from("workflow_templates")
    .select("*")
    .in("category", codes)
    .order("name");
  if (error) throw error;
  return (data ?? []) as unknown as Template[];
}
