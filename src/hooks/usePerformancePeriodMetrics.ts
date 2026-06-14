import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { currentPeriodKey } from "@/lib/performanceHubTheme";
import { isPersonalWalletBudgetKind } from "@/incentives/lib/walletKpiFilter";

export interface PerformancePeriodMetrics {
  loading: boolean;
  period: string;
  verifiedRevenue: number;
  discountTotal: number;
  netRevenue: number;
  walletUnlocked: number;
  walletPotential: number;
  offersRedeemed: number;
  cashIncentiveDue: number;
  runLocked: boolean;
  runId: string | null;
  payoutCount: number;
}

async function counselorIdsForBranch(branchName: string | null): Promise<Set<string> | null> {
  if (!branchName || branchName === "All branches") return null;
  const { data: br } = await supabase.from("branches").select("id").eq("name", branchName).maybeSingle();
  if (!br?.id) return new Set();
  const { data: profs } = await supabase.from("profiles").select("id").eq("branch_id", br.id);
  return new Set(((profs ?? []) as { id: string }[]).map((p) => p.id));
}

function inSet(id: string, set: Set<string> | null) {
  return !set || set.has(id);
}

export function usePerformancePeriodMetrics(
  period = currentPeriodKey(),
  branchName: string | null = null,
): PerformancePeriodMetrics {
  const [state, setState] = useState<PerformancePeriodMetrics>({
    loading: true,
    period,
    verifiedRevenue: 0,
    discountTotal: 0,
    netRevenue: 0,
    walletUnlocked: 0,
    walletPotential: 0,
    offersRedeemed: 0,
    cashIncentiveDue: 0,
    runLocked: false,
    runId: null,
    payoutCount: 0,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setState((s) => ({ ...s, loading: true, period }));

      const counselorFilter = await counselorIdsForBranch(branchName);
      const periodStart = `${period}-01`;

      const [achRes, walletsRes, allocsRes, runsRes] = await Promise.all([
        supabase.rpc("fn_counselor_period_achievement", { _period_key: period }),
        supabase
          .from("discount_wallets")
          .select("counselor_id, unlocked_amount, potential_wallet, budget_kind")
          .eq("period_key", period),
        supabase
          .from("wallet_allocations")
          .select("amount, counselor_id, offer_id, status")
          .eq("status", "applied")
          .gte("created_at", periodStart),
        supabase
          .from("incentive_runs")
          .select("id, locked, total_settlement, status")
          .eq("period_key", period)
          .order("calculated_at", { ascending: false }),
      ]);

      const achievements = ((achRes.data ?? []) as {
        counselor_id: string;
        achieved_revenue?: number;
      }[]).filter((a) => inSet(a.counselor_id, counselorFilter));

      const verifiedRevenue = achievements.reduce((s, a) => s + Number(a.achieved_revenue ?? 0), 0);

      const wallets = ((walletsRes.data ?? []) as {
        counselor_id: string;
        unlocked_amount?: number;
        potential_wallet?: number;
        budget_kind?: string;
      }[]).filter(
        (w) => inSet(w.counselor_id, counselorFilter) && isPersonalWalletBudgetKind(w.budget_kind),
      );

      const walletUnlocked = wallets.reduce((s, w) => s + Number(w.unlocked_amount ?? 0), 0);
      const walletPotential = wallets.reduce((s, w) => s + Number(w.potential_wallet ?? 0), 0);

      const allocs = ((allocsRes.data ?? []) as { amount: number; counselor_id: string; offer_id?: string | null }[]).filter(
        (a) => inSet(a.counselor_id, counselorFilter),
      );
      const discountTotal = allocs.reduce((s, a) => s + Number(a.amount ?? 0), 0);
      const offersRedeemed = allocs.filter((a) => a.offer_id).length;

      const runs = (runsRes.data ?? []) as { id: string; locked: boolean; total_settlement?: number }[];
      const lockedRun = runs.find((r) => r.locked);
      const cashIncentiveDue = lockedRun
        ? Number(lockedRun.total_settlement ?? 0)
        : runs.reduce((s, r) => s + Number(r.total_settlement ?? 0), 0);

      const runIds = runs.map((r) => r.id);
      let payoutCount = 0;
      if (runIds.length) {
        const { count } = await supabase
          .from("incentive_payouts")
          .select("id", { count: "exact", head: true })
          .in("run_id", runIds);
        payoutCount = count ?? 0;
      }

      if (cancelled) return;

      setState({
        loading: false,
        period,
        verifiedRevenue,
        discountTotal,
        netRevenue: Math.max(verifiedRevenue - discountTotal, 0),
        walletUnlocked,
        walletPotential,
        offersRedeemed,
        cashIncentiveDue,
        runLocked: !!lockedRun,
        runId: lockedRun?.id ?? runs[0]?.id ?? null,
        payoutCount,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [period, branchName]);

  return state;
}
