import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { forecastMonthEnd } from "@/incentives/lib/incentiveEngineLogic";
import { isPersonalWalletBudgetKind } from "@/incentives/lib/walletKpiFilter";
import { currentPeriodKey } from "@/lib/performanceHubTheme";

export interface TeamPerformanceRow {
  counselorId: string;
  name: string;
  branchName: string | null;
  roleLabel: string;
  targetPct: number | null;
  netRevenue: number;
  walletSpendable: number;
  walletSpent: number;
  cashProjected: number;
  cashLocked: number | null;
}

async function resolveBranchFilter(
  branchName: string | null,
  managerBranchId: string | null | undefined,
): Promise<string | null> {
  if (branchName && branchName !== "All branches") return branchName;
  if (managerBranchId) {
    const { data: br } = await supabase.from("branches").select("name").eq("id", managerBranchId).maybeSingle();
    return (br as { name?: string } | null)?.name ?? null;
  }
  return null;
}

export function usePerformanceTeamRows(
  period = currentPeriodKey(),
  branchName: string | null = null,
  managerBranchId?: string | null,
) {
  const [rows, setRows] = useState<TeamPerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [effectiveBranch, setEffectiveBranch] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const branchFilter = await resolveBranchFilter(branchName, managerBranchId);
      setEffectiveBranch(branchFilter);

      let branchId: string | null = null;
      if (branchFilter) {
        const { data: br } = await supabase.from("branches").select("id").eq("name", branchFilter).maybeSingle();
        branchId = (br as { id?: string } | null)?.id ?? null;
      }

      const [achRes, profRes, rolesRes, walletsRes, runsRes, allocsRes] = await Promise.all([
        supabase.rpc("fn_counselor_period_achievement", { _period_key: period }),
        supabase.from("profiles").select("id, full_name, branch_id"),
        supabase.from("user_roles").select("user_id, role"),
        supabase
          .from("discount_wallets")
          .select("id, counselor_id, unlocked_amount, potential_wallet, currency, budget_kind")
          .eq("period_key", period),
        supabase.from("incentive_runs").select("id, locked").eq("period_key", period),
        supabase
          .from("wallet_allocations")
          .select("wallet_id, amount, status")
          .eq("status", "applied"),
      ]);

      const branches = new Map<string, string>();
      const branchIds = [...new Set(((profRes.data ?? []) as { branch_id?: string }[]).map((p) => p.branch_id).filter(Boolean))];
      if (branchIds.length) {
        const { data: brs } = await supabase.from("branches").select("id, name").in("id", branchIds as string[]);
        for (const b of (brs ?? []) as { id: string; name: string }[]) branches.set(b.id, b.name);
      }

      const roleMap = new Map<string, string>();
      for (const r of (rolesRes.data ?? []) as { user_id: string; role: string }[]) {
        if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, r.role);
      }

      const profiles = ((profRes.data ?? []) as { id: string; full_name?: string; branch_id?: string }[]).filter((p) => {
        if (!branchId) return true;
        return p.branch_id === branchId;
      });

      const achievements = new Map(
        ((achRes.data ?? []) as { counselor_id: string; achievement_pct?: number; achieved_revenue?: number }[]).map(
          (a) => [a.counselor_id, a],
        ),
      );

      const walletsByCounselor = new Map<string, { id: string; unlocked: number }>();
      for (const w of (walletsRes.data ?? []) as {
        id: string;
        counselor_id: string;
        unlocked_amount?: number;
        budget_kind?: string;
      }[]) {
        if (!isPersonalWalletBudgetKind(w.budget_kind)) continue;
        walletsByCounselor.set(w.counselor_id, {
          id: w.id,
          unlocked: Number(w.unlocked_amount ?? 0),
        });
      }

      const spentByWallet = new Map<string, number>();
      for (const a of (allocsRes.data ?? []) as { wallet_id: string; amount: number }) {
        spentByWallet.set(a.wallet_id, (spentByWallet.get(a.wallet_id) ?? 0) + Number(a.amount ?? 0));
      }

      const runIds = ((runsRes.data ?? []) as { id: string; locked: boolean }[]).map((r) => r.id);
      const hasLocked = ((runsRes.data ?? []) as { locked: boolean }[]).some((r) => r.locked);
      const earnedByCounselor = new Map<string, number>();
      if (runIds.length) {
        const { data: li } = await supabase
          .from("incentive_line_items")
          .select("counselor_id, earned_amount")
          .in("run_id", runIds);
        for (const row of (li ?? []) as { counselor_id: string; earned_amount?: number }[]) {
          earnedByCounselor.set(
            row.counselor_id,
            (earnedByCounselor.get(row.counselor_id) ?? 0) + Number(row.earned_amount ?? 0),
          );
        }
      }

      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

      const teamRows: TeamPerformanceRow[] = profiles
        .filter((p) => achievements.has(p.id) || walletsByCounselor.has(p.id))
        .map((p) => {
          const ach = achievements.get(p.id);
          const wallet = walletsByCounselor.get(p.id);
          const spent = wallet ? (spentByWallet.get(wallet.id) ?? 0) : 0;
          const spendable = wallet ? Math.max(wallet.unlocked - spent, 0) : 0;
          const earned = earnedByCounselor.get(p.id) ?? 0;
          return {
            counselorId: p.id,
            name: p.full_name ?? p.id.slice(0, 8),
            branchName: p.branch_id ? (branches.get(p.branch_id) ?? null) : null,
            roleLabel: roleMap.get(p.id) ?? "staff",
            targetPct: ach?.achievement_pct != null ? Number(ach.achievement_pct) : null,
            netRevenue: Number(ach?.achieved_revenue ?? 0),
            walletSpendable: spendable,
            walletSpent: spent,
            cashProjected: forecastMonthEnd(earned, now.getDate(), daysInMonth),
            cashLocked: hasLocked ? earned : null,
          };
        })
        .sort((a, b) => b.netRevenue - a.netRevenue);

      if (!cancelled) {
        setRows(teamRows);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [period, branchName, managerBranchId]);

  return { rows, loading, effectiveBranch };
}
