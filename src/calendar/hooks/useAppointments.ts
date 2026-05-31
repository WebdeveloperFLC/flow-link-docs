import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type {
  CalendarEventWithRelations,
  CalendarInternalNote,
  CalendarEventAuditRow,
  CalendarEventStatus,
} from "../lib/calendarTypes";

export type AppointmentFilters = {
  status?: CalendarEventStatus[];
  appointmentType?: string | null;
  userId?: string | null;
  search?: string;
};

// Fetch appointments in a date range, with participants + meeting type joined.
export function useAppointmentsRange(fromDate: string, toDate: string, filters: AppointmentFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["calendar_appointments_range", user?.id, fromDate, toDate, filters],
    enabled: !!user,
    queryFn: async () => {
      let q = (supabase as any)
        .from("calendar_events")
        .select("*, calendar_participants(*), calendar_meeting_types(meeting_name,color_code,slot_duration_minutes)")
        .gte("event_date", fromDate)
        .lte("event_date", toDate)
        .order("event_date")
        .order("start_time");
      if (filters.userId) q = q.eq("user_id", filters.userId);
      if (filters.status?.length) q = q.in("status", filters.status);
      if (filters.appointmentType) q = q.eq("appointment_type", filters.appointmentType);
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as CalendarEventWithRelations[];
      if (filters.search?.trim()) {
        const s = filters.search.toLowerCase();
        rows = rows.filter((e) => {
          const p = e.calendar_participants?.[0];
          return (
            e.event_title?.toLowerCase().includes(s) ||
            e.event_reference?.toLowerCase().includes(s) ||
            e.appointment_type?.toLowerCase().includes(s) ||
            p?.full_name?.toLowerCase().includes(s) ||
            p?.email?.toLowerCase().includes(s) ||
            p?.mobile_number?.toLowerCase().includes(s)
          );
        });
      }
      return rows;
    },
  });
}

export function useAppointment(id: string | undefined) {
  return useQuery({
    queryKey: ["calendar_appointment", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("calendar_events")
        .select("*, calendar_participants(*), calendar_meeting_types(meeting_name,color_code,slot_duration_minutes)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as CalendarEventWithRelations | null;
    },
  });
}

export function useAppointmentAudit(id: string | undefined) {
  return useQuery({
    queryKey: ["calendar_appointment_audit", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("calendar_event_audit")
        .select("*")
        .eq("event_id", id)
        .order("at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CalendarEventAuditRow[];
    },
  });
}

export function useInternalNotes(id: string | undefined) {
  return useQuery({
    queryKey: ["calendar_internal_notes", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("calendar_internal_notes")
        .select("*")
        .eq("event_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CalendarInternalNote[];
    },
  });
}

export function useAddInternalNote() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ event_id, body }: { event_id: string; body: string }) => {
      const { error } = await (supabase as any)
        .from("calendar_internal_notes")
        .insert({ event_id, body, author_id: user!.id });
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["calendar_internal_notes", vars.event_id] }),
  });
}

export type CreateAppointmentInput = {
  meeting_type_id: string;
  event_title?: string | null;
  appointment_type?: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  host_timezone: string;
  notes?: string | null;
  participant: {
    full_name: string;
    email: string;
    mobile_number: string;
    company_name?: string | null;
  };
};

export function useCreateAppointment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAppointmentInput) => {
      const { data: event, error } = await (supabase as any)
        .from("calendar_events")
        .insert({
          user_id: user!.id,
          meeting_type_id: input.meeting_type_id,
          event_title: input.event_title ?? null,
          appointment_type: input.appointment_type ?? null,
          event_date: input.event_date,
          start_time: input.start_time,
          end_time: input.end_time,
          host_timezone: input.host_timezone,
          visitor_timezone: input.host_timezone,
          notes: input.notes ?? null,
          status: "scheduled",
        })
        .select()
        .single();
      if (error) throw error;
      const { error: pErr } = await (supabase as any).from("calendar_participants").insert({
        event_id: event.id,
        full_name: input.participant.full_name,
        email: input.participant.email,
        mobile_number: input.participant.mobile_number,
        company_name: input.participant.company_name ?? null,
      });
      if (pErr) throw pErr;
      return event;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar_appointments_range"] });
      qc.invalidateQueries({ queryKey: ["calendar_events_upcoming"] });
      qc.invalidateQueries({ queryKey: ["calendar_event_stats"] });
    },
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const { error } = await (supabase as any).from("calendar_events").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["calendar_appointments_range"] });
      qc.invalidateQueries({ queryKey: ["calendar_events_upcoming"] });
      qc.invalidateQueries({ queryKey: ["calendar_event_stats"] });
      qc.invalidateQueries({ queryKey: ["calendar_appointment", vars.id] });
      qc.invalidateQueries({ queryKey: ["calendar_appointment_audit", vars.id] });
    },
  });
}

export function useAppointmentReminders(id: string | undefined) {
  return useQuery({
    queryKey: ["calendar_notifications", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("calendar_notifications")
        .select("*")
        .eq("event_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; channel: string; status: string; created_at: string; sent_at: string | null }>;
    },
  });
}