import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { MeetingType } from "../lib/calendarTypes";

export function useMeetingTypesFull() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["meeting_types_full", user?.id],
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

export function useCreateMeetingType() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<MeetingType> & { meeting_name: string; slot_duration_minutes: number; slug: string }) => {
      const { data, error } = await (supabase as any)
        .from("calendar_meeting_types")
        .insert({ ...body, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as MeetingType;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting_types_full"] }),
  });
}

export function useUpdateMeetingType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<MeetingType> }) => {
      const { data, error } = await (supabase as any)
        .from("calendar_meeting_types")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as MeetingType;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting_types_full"] }),
  });
}

export function useDeleteMeetingTypeFull() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("calendar_meeting_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting_types_full"] }),
  });
}