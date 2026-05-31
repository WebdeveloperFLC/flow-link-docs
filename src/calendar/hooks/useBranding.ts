import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CompanyBranding } from "../lib/calendarTypes";

export function useCompanyBranding() {
  return useQuery({
    queryKey: ["calendar_company_branding"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("calendar_company_branding")
        .select("*")
        .eq("singleton", true)
        .maybeSingle();
      if (error) throw error;
      return data as CompanyBranding | null;
    },
  });
}

export function useUpdateBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<CompanyBranding>) => {
      const { data, error } = await (supabase as any)
        .from("calendar_company_branding")
        .update(patch)
        .eq("singleton", true)
        .select()
        .single();
      if (error) throw error;
      return data as CompanyBranding;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar_company_branding"] }),
  });
}

export async function uploadCompanyAsset(kind: "logo", file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("calendar-company-branding")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("calendar-company-branding").getPublicUrl(path);
  return data.publicUrl;
}