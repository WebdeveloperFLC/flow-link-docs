import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  aggregateIncentiveLedgerRows,
  buildLiabilityForecast,
  buildPayoutCycleConfig,
  incentiveLedgerCmsKpis,
  type IncentiveLedgerCmsRow,
  type IncentiveLiabilityForecast,
  type PayoutCycleConfigSummary,
} from "@/incentives/lib/incentiveLedgerCmsLogic";

function yearPrefix(period: string) {
  const y = period.slice(0, 4);
  return y.length === 4 ? y : String(new Date().getFullYear());
}

export function useIncentiveLedgerCmsData(period: string, branchId: string) {
  const [allRows, setAllRows] = useState<IncentiveLedgerCmsRow[]>([]);
  const [forecast, setForecast] = useState<IncentiveLiabilityForecast>({
    eligibleNow: 0,
    pendingApproval: 0,
    forecastNextQuarter: 0,
    monthlyBars: [],
  });
  const [payoutConfig, setPayoutConfig] = useState<PayoutCycleConfigSummary>({
    periodTypes: ["Monthly"],
    minThreshold: null,
    carryBelowThreshold: true,
    thresholdNote: "",
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const y = yearPrefix(period);
      const runsRes = await supabase
        .from("incentive_runs")
        .select("id,period_key,total_settlement,locked")
        .like("period_key", `${y}-%`);
      const runIds = ((runsRes.data ?? []) as { id: string }[]).map((r) => r.id);

      const [lineRes, payoutRes, adjRes, profRes, branchRes, plansRes] = await Promise.all([
        runIds.length
          ? supabase
              .from("incentive_line_items")
              .select("counselor_id,earned_amount,settlement_currency,run_id")
              .in("run_id", runIds)
          : Promise.resolve({ data: [], error: null }),
        supabase.from("incentive_payouts").select("counselor_id,gross_amount,net_amount,settlement_currency,status,created_at").gte("created_at", `${y}-01-01`),
        supabase.from("incentive_adjustments").select("counselor_id,amount,currency,adjustment_type,created_at").gte("created_at", `${y}-01-01`),
        supabase.from("profiles").select("id,full_name,branch_id"),
        supabase.from("branches").select("id,name"),
        supabase.from("incentive_plans").select("period_type,is_active"),
      ]);

      const branchMap = new Map(((branchRes.data ?? []) as { id: string; name: string }[]).map((b) => [b.id, b.name]));
      const profiles = (profRes.data ?? []) as { id: string; full_name: string | null; branch_id: string | null }[];

      const lineItems = ((lineRes.data ?? []) as { counselor_id: string; earned_amount: number; settlement_currency: string }[]).map(
        (li) => ({
          counselor_id: li.counselor_id,
          earned_amount: li.earned_amount,
          settlement_currency: li.settlement_currency,
        }),
      );

      const payouts = (payoutRes.data ?? []) as {
        counselor_id: string;
        gross_amount: number;
        net_amount: number;
        settlement_currency: string;
        status: string;
      }[];

      const adjustments = (adjRes.data ?? []) as {
        counselor_id: string;
        amount: number;
        currency: string;
        adjustment_type: string;
      }[];

      let rows = aggregateIncentiveLedgerRows(lineItems, payouts, adjustments, profiles, branchMap);

      if (branchId) {
        const branchName = branchMap.get(branchId);
        if (branchName) {
          rows = rows.filter((r) => {
            const profile = profiles.find((p) => p.id === r.counselorId);
            return profile?.branch_id === branchId;
          });
        }
      }

      setAllRows(rows);
      setForecast(
        buildLiabilityForecast(
          rows,
          (runsRes.data ?? []) as { period_key: string; total_settlement: number; locked: boolean }[],
        ),
      );
      setPayoutConfig(buildPayoutCycleConfig((plansRes.data ?? []) as { period_type: string; is_active: boolean }[]));
    } catch {
      setAllRows([]);
      setForecast({ eligibleNow: 0, pendingApproval: 0, forecastNextQuarter: 0, monthlyBars: [] });
    } finally {
      setLoading(false);
    }
  }, [period, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(() => incentiveLedgerCmsKpis(allRows), [allRows]);

  return { rows: allRows, kpis, forecast, payoutConfig, loading, reload: load };
}
