import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type {
  CalendarProfile,
  MeetingType,
  Availability,
  Break,
  UnavailableDate,
  CalendarEvent,
} from "../lib/calendarTypes";

// Profile -------------------------------------------------------------
export function useCalendarProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["calendar_profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("calendar_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as CalendarProfile | null;
    },
  });
}

export function useUpsertProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<CalendarProfile> & { booking_slug?: string; full_name?: string; timezone?: string }) => {
      const body = { ...patch, user_id: user!.id };
      const { data, error } = await (supabase as any)
        .from("calendar_profiles")
        .upsert(body, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data as CalendarProfile;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar_profile"] }),
  });
}

// Meeting Types -------------------------------------------------------
export function useMeetingTypes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["calendar_meeting_types", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("calendar_meeting_types")
        .select("*")
        .eq("user_id", user!.id)
        .order("meeting_name");
      if (error) throw error;
      return (data ?? []) as MeetingType[];
    },
  });
}

export function useSaveMeetingType() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mt: Partial<MeetingType> & { meeting_name: string; slot_duration_minutes: number }) => {
      const body = { ...mt, user_id: user!.id };
      const { data, error } = await (supabase as any).from("calendar_meeting_types").upsert(body).select().single();
      if (error) throw error;
      return data as MeetingType;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar_meeting_types"] }),
  });
}

export function useDeleteMeetingType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("calendar_meeting_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar_meeting_types"] }),
  });
}

// Availability --------------------------------------------------------
export function useAvailability() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["calendar_availability", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("calendar_availability")
        .select("*")
        .eq("user_id", user!.id)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return (data ?? []) as Availability[];
    },
  });
}

export function useSaveAvailability() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: Partial<Availability> & { day_of_week: number; start_time: string; end_time: string }) => {
      const body = { ...a, user_id: user!.id };
      const { data, error } = await (supabase as any).from("calendar_availability").upsert(body).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar_availability"] }),
  });
}

export function useDeleteAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("calendar_availability").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar_availability"] }),
  });
}

// Breaks --------------------------------------------------------------
export function useBreaks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["calendar_breaks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("calendar_breaks")
        .select("*")
        .eq("user_id", user!.id)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return (data ?? []) as Break[];
    },
  });
}

export function useSaveBreak() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: Partial<Break> & { day_of_week: number; start_time: string; end_time: string }) => {
      const body = { ...b, user_id: user!.id };
      const { data, error } = await (supabase as any).from("calendar_breaks").upsert(body).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar_breaks"] }),
  });
}

export function useDeleteBreak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("calendar_breaks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar_breaks"] }),
  });
}

// Unavailable Dates ---------------------------------------------------
export function useUnavailableDates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["calendar_unavailable_dates", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("calendar_unavailable_dates")
        .select("*")
        .eq("user_id", user!.id)
        .order("unavailable_date");
      if (error) throw error;
      return (data ?? []) as UnavailableDate[];
    },
  });
}

export function useAddUnavailableDate() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { unavailable_date: string; reason?: string | null }) => {
      const body = { ...row, user_id: user!.id };
      const { data, error } = await (supabase as any)
        .from("calendar_unavailable_dates")
        .upsert(body, { onConflict: "user_id,unavailable_date" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar_unavailable_dates"] }),
  });
}

export function useDeleteUnavailableDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("calendar_unavailable_dates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar_unavailable_dates"] }),
  });
}

// Events --------------------------------------------------------------
export function useUpcomingEvents(limit = 20) {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ["calendar_events_upcoming", user?.id, today, limit],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("calendar_events")
        .select("*, calendar_participants(*), calendar_meeting_types(meeting_name,color_code)")
        .eq("user_id", user!.id)
        .gte("event_date", today)
        .in("status", ["pending", "scheduled"])
        .order("event_date")
        .order("start_time")
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Array<CalendarEvent & { calendar_participants: any[]; calendar_meeting_types: any }>;
    },
  });
}

export function useEventStats() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const last30 = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  return useQuery({
    queryKey: ["calendar_event_stats", user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const head = { count: "exact" as const, head: true };
      const base = (supabase as any).from("calendar_events").select("id", head).eq("user_id", user!.id);
      const [total, upcoming, pending, cancelled] = await Promise.all([
        base,
        (supabase as any)
          .from("calendar_events")
          .select("id", head)
          .eq("user_id", user!.id)
          .gte("event_date", today)
          .in("status", ["pending", "scheduled"]),
        (supabase as any)
          .from("calendar_events")
          .select("id", head)
          .eq("user_id", user!.id)
          .eq("status", "pending"),
        (supabase as any)
          .from("calendar_events")
          .select("id", head)
          .eq("user_id", user!.id)
          .eq("status", "cancelled")
          .gte("event_date", last30),
      ]);
      return {
        total: total.count ?? 0,
        upcoming: upcoming.count ?? 0,
        pending: pending.count ?? 0,
        cancelled: cancelled.count ?? 0,
      };
    },
  });
}