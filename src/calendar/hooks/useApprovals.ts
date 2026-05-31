import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCalendarScope } from "../lib/permissions";
import { useAuth } from "@/contexts/AuthContext";

export function usePendingApprovals() {
  const { user } = useAuth();
  const scope = useCalendarScope();
  return useQuery({
    queryKey: ["pending_approvals", scope, user?.id],
    enabled: !!user,
    queryFn: async () => {
      let q = (supabase as any)
        .from("calendar_events")
        .select("*, calendar_participants(*), calendar_meeting_types(meeting_name,color_code,requires_approval)")
        .eq("status", "pending")
        .order("event_date")
        .order("start_time");
      if (scope === "user") q = q.eq("user_id", user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useApproveAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await (supabase as any)
        .from("calendar_events")
        .update({ status: "scheduled" })
        .eq("id", eventId);
      if (error) throw error;
      await (supabase as any)
        .from("calendar_slot_reservations")
        .update({ released: true })
        .eq("event_id", eventId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending_approvals"] });
      qc.invalidateQueries({ queryKey: ["calendar_events_upcoming"] });
    },
  });
}

export function useDeclineAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, reason }: { eventId: string; reason: string }) => {
      const { error } = await (supabase as any)
        .from("calendar_events")
        .update({ status: "declined", cancellation_reason: reason })
        .eq("id", eventId);
      if (error) throw error;
      await (supabase as any)
        .from("calendar_slot_reservations")
        .update({ released: true })
        .eq("event_id", eventId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending_approvals"] }),
  });
}