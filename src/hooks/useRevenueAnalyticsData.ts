import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePerformancePeriodMetrics } from "@/hooks/usePerformancePeriodMetrics";
import {
  mapDimensionRows,
  periodShortLabel,
  rollingPeriodKeys,
  type DimensionRow,
} from "@/incentives/lib/revenueAnalyticsLogic";
import { toMixSlices } from "@/incentives/lib/executiveDashboardLogic";

export interface RevenueTrendPoint {
  period: string;
  label: string;
  revenue: number;
}

export function useRevenueAnalyticsData(period: string, branchName: string | null) {
  const metrics = usePerformancePeriodMetrics(period, branchName);
  const [trend, setTrend] = useState<RevenueTrendPoint[]>([]);
  const [serviceRows, setServiceRows] = useState<DimensionRow[]>([]);
  const [countryMix, setCountryMix] = useState<ReturnType<typeof toMixSlices>>([]);
  const [extrasLoading, setExtrasLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setExtrasLoading(true);
      const periods = rollingPeriodKeys(period, 6);

      let branchCounselorIds: Set<string> | null = null;
      if (branchName && branchName !== "All branches") {
        const { data: br } = await supabase.from("branches").select("id").eq("name", branchName).maybeSingle();
        if (br?.id) {
          const { data: profs } = await supabase.from("profiles").select("id").eq("branch_id", br.id);
          branchCounselorIds = new Set(((profs ?? []) as { id: string }[]).map((p) => p.id));
        } else {
          branchCounselorIds = new Set();
        }
      }

      const [trendResults, serviceRes, countryRes] = await Promise.all([
        Promise.all(
          periods.map(async (pk) => {
            const { data } = await supabase.rpc("fn_counselor_period_achievement", { _period_key: pk });
            const rows = (data ?? []) as { achieved_revenue?: number; counselor_id?: string }[];
            const revenue = rows
              .filter((r) => !branchCounselorIds || (r.counselor_id && branchCounselorIds.has(r.counselor_id)))
              .reduce((s, r) => s + Number(r.achieved_revenue ?? 0), 0);
            return { period: pk, label: periodShortLabel(pk), revenue };
          }),
        ),
        supabase.rpc("fn_incentive_dimension_leaderboard", {
          _period_key: period,
          _group_by: "service",
          _limit: 8,
        }),
        supabase.rpc("fn_incentive_dimension_leaderboard", {
          _period_key: period,
          _group_by: "country",
          _limit: 6,
        }),
      ]);

      if (cancelled) return;

      setTrend(trendResults);
      setServiceRows(
        mapDimensionRows(
          ((serviceRes.data ?? []) as { group_label: string; total_amount: number; event_count: number }[]) ?? [],
        ),
      );
      setCountryMix(
        toMixSlices(
          ((countryRes.data ?? []) as { group_label: string; total_amount: number }[]).map((r) => ({
            label: r.group_label || "Other",
            amount: Number(r.total_amount ?? 0),
          })),
        ),
      );
      setExtrasLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [period, branchName]);

  return {
    metrics,
    trend,
    serviceRows,
    countryMix,
    loading: metrics.loading || extrasLoading,
  };
}
