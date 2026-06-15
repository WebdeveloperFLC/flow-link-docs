import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  type Master,
  type Override,
  type FeeItem,
  type SubmissionItem,
  type Attachment,
  type ChecklistFile,
  type VisaFormFile,
  type SopTask,
  scopeByCountry,
} from "@/lib/serviceLibrary";
import { buildAcademyViewModel } from "@/lib/service-library/buildAcademyViewModel";

export function useServiceAcademyDetail(masterId: string | null, country: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sl-library-detail", masterId, country, user?.id],
    enabled: !!masterId,
    staleTime: 60_000,
    // Never show the previous service's view while another id is loading — invalid tabs crash Radix.
    placeholderData: (previous) =>
      previous && masterId && previous.master.id === masterId ? previous : undefined,
    queryFn: async () => {
      const { data: master, error } = await supabase
        .from("service_library")
        .select("*, service_library_countries(country)")
        .eq("id", masterId!)
        .maybeSingle();
      if (error) throw error;
      if (!master) return null;

      const m = master as unknown as Master & { service_library_countries: { country: string }[] };
      const countries = (m.service_library_countries ?? []).map((c) => c.country);
      const detailCountry =
        m.service_category === "visa_immigration"
          ? country && country !== "ALL"
            ? country
            : countries[0] ?? null
          : null;

      let override: Override | null = null;
      if (detailCountry) {
        const { data: ov } = await supabase
          .from("service_library_overrides")
          .select("*")
          .eq("library_id", m.id)
          .eq("country", detailCountry)
          .maybeSingle();
        override = (ov ?? null) as Override | null;
      }

      const [feesRes, attachRes, filesRes, visaFormsRes, sopRes, subRes, completionsRes] = await Promise.all([
        supabase.from("service_library_fee_items").select("*").eq("library_id", m.id).order("display_order"),
        supabase.from("service_library_attachments").select("*").eq("library_id", m.id).order("display_order"),
        supabase
          .from("service_library_checklist_files")
          .select("*")
          .eq("library_id", m.id)
          .order("version", { ascending: false }),
        supabase
          .from("service_library_visa_form_files" as "service_library_checklist_files")
          .select("*")
          .eq("library_id", m.id)
          .order("sort_order")
          .order("version", { ascending: false }),
        supabase
          .from("service_library_sop_tasks")
          .select("*")
          .eq("library_id", m.id)
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("service_library_submission_checklist")
          .select("*")
          .eq("library_id", m.id)
          .eq("is_active", true)
          .order("sort_order"),
        user?.id
          ? supabase
              .from("service_library_submission_completions")
              .select("item_id")
              .eq("user_id", user.id)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const feeItems = scopeByCountry((feesRes.data ?? []) as FeeItem[], detailCountry);
      const attachments = scopeByCountry((attachRes.data ?? []) as Attachment[], detailCountry);
      const checklistFiles = scopeByCountry((filesRes.data ?? []) as ChecklistFile[], detailCountry);
      const visaFormFiles = scopeByCountry((visaFormsRes.data ?? []) as VisaFormFile[], detailCountry);
      const submissionItems = scopeByCountry((subRes.data ?? []) as SubmissionItem[], detailCountry);
      const completedIds = new Set(
        ((completionsRes.data ?? []) as { item_id: string }[]).map((r) => r.item_id),
      );

      const view = buildAcademyViewModel({
        master: m,
        override,
        country: detailCountry,
        countries,
        feeItems,
        submissionItems,
        checklistFiles,
        visaFormFiles,
        attachments,
        sopTasks: scopeByCountry((sopRes.data ?? []) as SopTask[], detailCountry),
        submissionCompletedIds: completedIds,
      });

      return { master: m, override, detailCountry, countries, view };
    },
  });
}
