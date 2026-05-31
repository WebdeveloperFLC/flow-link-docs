import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CalendarEventCrmLink, CrmEntityType } from "../lib/calendarTypes";

export function useCrmLinks(eventId: string | undefined) {
  return useQuery({
    queryKey: ["crm_links", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("calendar_event_crm_links")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as CalendarEventCrmLink[];
    },
  });
}

export function useAddCrmLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { event_id: string; entity_type: CrmEntityType; entity_id: string; is_primary?: boolean }) => {
      const { error } = await (supabase as any)
        .from("calendar_event_crm_links")
        .insert({ ...row, linked_automatically: false });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["crm_links", vars.event_id] }),
  });
}

export function useRemoveCrmLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, eventId: _ }: { id: string; eventId: string }) => {
      const { error } = await (supabase as any).from("calendar_event_crm_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["crm_links", vars.eventId] }),
  });
}

export async function searchLeads(query: string) {
  const q = `%${query}%`;
  const { data, error } = await (supabase as any)
    .from("leads")
    .select("id, first_name, last_name, email, phone, lead_number")
    .or(`first_name.ilike.${q},last_name.ilike.${q},email.ilike.${q},phone.ilike.${q},lead_number.ilike.${q}`)
    .limit(10);
  if (error) throw error;
  return data ?? [];
}