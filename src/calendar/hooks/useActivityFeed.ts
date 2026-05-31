import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCalendarScope } from "../lib/permissions";

export function useActivityFeed(filters: { search?: string; toStatus?: string; days?: number } = {}) {
  const { user } = useAuth();
  const scope = useCalendarScope();
  const days = filters.days ?? 30;
  const from = new Date(Date.now() - days * 86400_000).toISOString();
  return useQuery({
    queryKey: ["calendar_activity_feed", scope, user?.id, filters],
    enabled: !!user,
    queryFn: async () => {
      let q = (supabase as any)
        .from("v_calendar_activity_feed")
        .select("*")
        .gte("at", from)
        .order("at", { ascending: false })
        .limit(200);
      if (scope === "user") q = q.eq("host_user_id", user!.id);
      if (filters.toStatus) q = q.eq("to_status", filters.toStatus);
      if (filters.search) {
        const s = `%${filters.search}%`;
        q = q.or(`event_reference.ilike.${s},visitor_name.ilike.${s},visitor_email.ilike.${s},event_title.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}