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
        .in("status", ["pending", "awaiting_requester", "reschedule_requested", "rescheduled_awaiting"])
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
    mutationFn: async (args: { eventId: string; meetingLink: string; remarks?: string }) => {
      const { data, error } = await supabase.functions.invoke("calendar-event-approve", {
        body: { event_id: args.eventId, meeting_link: args.meetingLink, remarks: args.remarks },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
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
      const { data, error } = await supabase.functions.invoke("calendar-event-decline", {
        body: { event_id: eventId, reason },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending_approvals"] }),
  });
}

export function useApproveReschedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { eventId: string; eventDate: string; startTime: string; endTime: string; meetingLink?: string }) => {
      const { data, error } = await supabase.functions.invoke("calendar-event-reschedule-approve", {
        body: {
          event_id: args.eventId, event_date: args.eventDate,
          start_time: args.startTime, end_time: args.endTime, meeting_link: args.meetingLink,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending_approvals"] }),
  });
}