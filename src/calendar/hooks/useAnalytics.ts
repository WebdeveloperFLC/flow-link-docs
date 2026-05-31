import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCalendarScope } from "../lib/permissions";

function startOfRange(days: number) {
  return new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
}

export function useAnalyticsMetrics(days = 30) {
  const { user } = useAuth();
  const scope = useCalendarScope();
  const from = startOfRange(days);
  const today = new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ["calendar_analytics_metrics", scope, user?.id, days],
    enabled: !!user,
    queryFn: async () => {
      const scopeFilter = (q: any) => (scope === "user" ? q.eq("user_id", user!.id) : q);
      const head = { count: "exact" as const, head: true };
      const cnt = (statusOr: string | string[] | null, opts?: { upcomingOnly?: boolean }) => {
        let q = (supabase as any).from("calendar_events").select("id", head).gte("event_date", from);
        if (statusOr) {
          if (Array.isArray(statusOr)) q = q.in("status", statusOr);
          else q = q.eq("status", statusOr);
        }
        if (opts?.upcomingOnly) q = q.gte("event_date", today);
        return scopeFilter(q);
      };
      const [total, upcoming, completed, cancelled, declined, noShow, pending] = await Promise.all([
        cnt(null),
        cnt(["pending", "scheduled"], { upcomingOnly: true }),
        cnt("completed"),
        cnt("cancelled"),
        cnt("declined"),
        cnt("no_show"),
        cnt("pending"),
      ]);
      return {
        total: total.count ?? 0,
        upcoming: upcoming.count ?? 0,
        completed: completed.count ?? 0,
        cancelled: cancelled.count ?? 0,
        declined: declined.count ?? 0,
        no_show: noShow.count ?? 0,
        pending: pending.count ?? 0,
      };
    },
  });
}

export function useMeetingTypeBreakdown(days = 30) {
  const { user } = useAuth();
  const scope = useCalendarScope();
  const from = startOfRange(days);
  return useQuery({
    queryKey: ["calendar_mt_breakdown", scope, user?.id, days],
    enabled: !!user,
    queryFn: async () => {
      let q = (supabase as any)
        .from("calendar_events")
        .select("meeting_type_id, calendar_meeting_types(meeting_name,color_code)")
        .gte("event_date", from);
      if (scope === "user") q = q.eq("user_id", user!.id);
      const { data, error } = await q;
      if (error) throw error;
      const grouped: Record<string, { name: string; color: string | null; count: number }> = {};
      for (const row of data ?? []) {
        const key = row.meeting_type_id;
        const name = row.calendar_meeting_types?.meeting_name ?? "Unknown";
        const color = row.calendar_meeting_types?.color_code ?? null;
        if (!grouped[key]) grouped[key] = { name, color, count: 0 };
        grouped[key].count += 1;
      }
      return Object.values(grouped).sort((a, b) => b.count - a.count);
    },
  });
}