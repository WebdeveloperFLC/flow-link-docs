import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { forecastMonthEnd } from "@/incentives/lib/incentiveEngineLogic";
import { currentPeriodKey } from "@/lib/performanceHubTheme";

export interface PerformanceHomeData {
  loading: boolean;
  period: string;
  profileName: string;
  branchName: string | null;
  wallet: {
    currency: string;
    achievementPct: number | null;
    assignedTarget: number | null;
    potential: number;
    unlocked: number;
    spent: number;
    spendable: number;
  } | null;
  revenueAchieved: number;
  revenueCurrency: string;
  walletDiscountTotal: number;
  earnedLocked: number;
  earnedProjected: number;
  earningRefreshedAt: string | null;
  earningLive: boolean;
  hasLockedRun: boolean;
  breakdown: {
    core: number;
    allied: number;
    travel: number;
    eventCount: number;
  } | null;
  branchLeaderboard: { rank: number; label: string; amount: number; isYou: boolean }[];
  payouts: { date: string; status: string; net: number; currency: string }[];
  planStack: {
    plan_name: string;
    plan_stack_role: string;
    earned_amount: number;
    settlement_currency: string;
    run_locked: boolean;
  }[];
  planStackTotal: number;
}

export function usePerformanceHomeData(userId: string | undefined, period = currentPeriodKey()): PerformanceHomeData {
  const [state, setState] = useState<PerformanceHomeData>({
    loading: true,
    period,
    profileName: "",
    branchName: null,
    wallet: null,
    revenueAchieved: 0,
    revenueCurrency: "INR",
    walletDiscountTotal: 0,
    earnedLocked: 0,
    earnedProjected: 0,
    earningRefreshedAt: null,
    earningLive: false,
    hasLockedRun: false,
    breakdown: null,
    branchLeaderboard: [],
    payouts: [],
    planStack: [],
    planStackTotal: 0,
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      setState((s) => ({ ...s, loading: true, period }));

      const [prof, w, bdRes, runsRes, p, lbBranch, allocs, stackRes] = await Promise.all([
        supabase.from("profiles").select("full_name, branch_id").eq("id", userId).maybeSingle(),
        supabase
          .from("discount_wallets")
          .select(
            "id, currency, assigned_target, potential_wallet, unlocked_amount, achievement_pct, budget_kind",
          )
          .eq("counselor_id", userId)
          .eq("period_key", period)
          .is("closed_at", null),
        supabase.rpc("fn_incentive_counselor_revenue_breakdown", {
          _counselor_id: userId,
          _period_key: period,
        }),
        supabase.from("incentive_runs").select("id, locked").eq("period_key", period),
        supabase
          .from("incentive_payouts")
          .select("net_amount, settlement_currency, status, created_at")
          .eq("counselor_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.rpc("fn_incentive_dimension_leaderboard", {
          _period_key: period,
          _group_by: "counselor",
          _limit: 8,
        }),
        supabase
          .from("wallet_allocations")
          .select("amount")
          .eq("counselor_id", userId)
          .eq("status", "applied")
          .gte("created_at", `${period}-01`),
        supabase.rpc("fn_counselor_plan_stack_summary", {
          _counselor_id: userId,
          _period_key: period,
        }),
      ]);

      let branchName: string | null = null;
      const branchId = (prof.data as { branch_id?: string } | null)?.branch_id;
      if (branchId) {
        const { data: br } = await supabase.from("branches").select("name").eq("id", branchId).maybeSingle();
        branchName = (br as { name?: string } | null)?.name ?? null;
      }

      const walletRows = (w.data ?? []) as {
        id?: string;
        currency?: string;
        assigned_target?: number;
        potential_wallet?: number;
        unlocked_amount?: number;
        achievement_pct?: number;
        budget_kind?: string;
      }[];

      let walletRow =
        walletRows.find((row) => row.budget_kind === "month_to_month") ??
        walletRows.find((row) => row.budget_kind === "personal") ??
        walletRows[0] ??
        null;

      if (walletRow?.id) {
        const { data: synced } = await supabase.rpc("fn_sync_wallet_metrics", { _wallet_id: walletRow.id });
        if (synced) {
          walletRow = synced as typeof walletRow;
        }
      }

      let spent = 0;
      if (walletRow?.id) {
        const { data: wa } = await supabase
          .from("wallet_allocations")
          .select("amount")
          .eq("wallet_id", walletRow.id)
          .eq("status", "applied");
        spent = ((wa ?? []) as { amount: number }[]).reduce((s, a) => s + Number(a.amount ?? 0), 0);
      }

      const runs = (runsRes.data ?? []) as { id: string; locked: boolean }[];
      const runIds = runs.map((r) => r.id);
      const hasLockedRun = runs.some((r) => r.locked);
      let earned = 0;
      if (runIds.length) {
        const { data: li } = await supabase
          .from("incentive_line_items")
          .select("earned_amount, run_id")
          .eq("counselor_id", userId)
          .in("run_id", runIds);
        earned = (li ?? []).reduce((s: number, r: { earned_amount?: number }) => s + Number(r.earned_amount ?? 0), 0);
      }

      const now = new Date();
      const projected = forecastMonthEnd(
        earned,
        now.getDate(),
        new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
      );

      const bd = bdRes.data as {
        core_revenue?: number;
        allied_revenue?: number;
        travel_revenue?: number;
        event_count?: number;
        currency?: string;
      } | null;

      const core = Number(bd?.core_revenue ?? 0);
      const allied = Number(bd?.allied_revenue ?? 0);
      const travel = Number(bd?.travel_revenue ?? 0);
      const revCcy = bd?.currency ?? "INR";

      const walletDiscountTotal = ((allocs.data ?? []) as { amount: number }[]).reduce(
        (s, a) => s + Number(a.amount ?? 0),
        0,
      );

      const lb = ((lbBranch.data ?? []) as {
        rank: number;
        group_key: string;
        group_label: string;
        total_amount: number;
        currency: string;
      }[]) ?? [];

      const planStackRows = ((stackRes.data ?? []) as {
        plan_name: string;
        plan_stack_role: string;
        earned_amount: number;
        settlement_currency: string;
        run_locked: boolean;
      }[]) ?? [];
      const planStackTotal = planStackRows.reduce((s, r) => s + Number(r.earned_amount ?? 0), 0);

      if (cancelled) return;

      setState({
        loading: false,
        period,
        profileName: (prof.data as { full_name?: string } | null)?.full_name ?? "",
        branchName,
        wallet: walletRow
          ? {
              currency: walletRow.currency ?? "INR",
              achievementPct: walletRow.achievement_pct ?? null,
              assignedTarget: walletRow.assigned_target ?? null,
              potential: Number(walletRow.potential_wallet ?? 0),
              unlocked: Number(walletRow.unlocked_amount ?? 0),
              spent,
              spendable: Math.max(Number(walletRow.unlocked_amount ?? 0) - spent, 0),
            }
          : null,
        revenueAchieved: core + allied + travel,
        revenueCurrency: revCcy,
        walletDiscountTotal,
        earnedLocked: earned,
        earnedProjected: projected,
        earningRefreshedAt: new Date().toISOString(),
        hasLockedRun,
        breakdown: bd
          ? { core, allied, travel, eventCount: Number(bd.event_count ?? 0) }
          : null,
        branchLeaderboard: lb.map((r) => ({
          rank: r.rank,
          label: r.group_label,
          amount: Number(r.total_amount),
          isYou: r.group_key === userId,
        })),
        payouts: ((p.data ?? []) as { created_at: string; status: string; net_amount: number; settlement_currency: string }[]).map(
          (x) => ({
            date: x.created_at,
            status: x.status,
            net: x.net_amount,
            currency: x.settlement_currency,
          }),
        ),
        planStack: planStackRows.map((r) => ({
          plan_name: r.plan_name,
          plan_stack_role: r.plan_stack_role,
          earned_amount: Number(r.earned_amount ?? 0),
          settlement_currency: r.settlement_currency ?? "INR",
          run_locked: Boolean(r.run_locked),
        })),
        planStackTotal,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, period]);

  // I8 — poll + realtime earning snapshot
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const refreshSnapshot = async () => {
      const { data } = await supabase.rpc("fn_counselor_earning_snapshot", {
        _counselor_id: userId,
        _period_key: period,
      });
      if (cancelled) return;
      const snap = data as { earned_total?: number; has_locked_run?: boolean; refreshed_at?: string } | null;
      if (!snap) return;
      setState((s) => ({
        ...s,
        earnedLocked: Number(snap.earned_total ?? s.earnedLocked),
        hasLockedRun: Boolean(snap.has_locked_run ?? s.hasLockedRun),
        earningRefreshedAt: snap.refreshed_at ?? new Date().toISOString(),
      }));
    };

    void refreshSnapshot();
    const pollId = window.setInterval(refreshSnapshot, 60_000);

    const channel = supabase
      .channel(`perf-earnings-${userId}-${period}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incentive_line_items", filter: `counselor_id=eq.${userId}` },
        () => {
          void refreshSnapshot();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "incentive_runs", filter: `period_key=eq.${period}` },
        () => {
          void refreshSnapshot();
        },
      )
      .subscribe((status) => {
        if (cancelled) return;
        setState((s) => ({ ...s, earningLive: status === "SUBSCRIBED" }));
      });

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      void supabase.removeChannel(channel);
    };
  }, [userId, period]);

  return state;
}
