import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "../lib/constants";
import { HR_DOC_TYPES } from "../lib/hrStorage";
import type { HrDocumentTypeRow } from "../lib/types";

export function useHrDocumentTypes(activeOnly = true) {
  return useQuery({
    queryKey: ["hr-document-types", HR_ORG_ID, activeOnly],
    queryFn: async () => {
      let q = supabase
        .from("hr_document_types" as never)
        .select("*")
        .eq("org_id", HR_ORG_ID)
        .order("sort_order", { ascending: true })
        .order("label", { ascending: true });
      if (activeOnly) {
        q = q.eq("is_active", true);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as HrDocumentTypeRow[];
    },
  });
}

/** Labels for upload dropdown — falls back to built-in list if master not seeded yet. */
export function useHrDocumentTypeLabels(): string[] {
  const { data = [] } = useHrDocumentTypes(true);
  if (data.length > 0) return data.map((d) => d.label);
  return [...HR_DOC_TYPES];
}
