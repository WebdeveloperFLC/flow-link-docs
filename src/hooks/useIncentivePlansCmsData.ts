import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildIncentivePlanCmsRow,
  incentivePlansCmsKpis,
  type IncentivePlanCmsRow,
} from "@/incentives/lib/incentivePlansCmsLogic";

type PlanRow = {
  id: string;
  name: string;
  is_active: boolean;
  revenue_basis: string;
  scope_type: string;
  role_key: string | null;
  settlement_currency: string;
  branch_id: string | null;
  plan_stack_role?: string | null;
};

type SlabRow = {
  plan_id: string;
  source_type: string;
  rate_type: string;
  rate_value: number;
  metric: string;
  min_threshold: number;
  max_threshold: number | null;
};

function yearPrefix(d = new Date()) {
  return String(d.getFullYear());
}

export function useIncentivePlansCmsData() {
  const [rows, setRows] = useState<IncentivePlanCmsRow[]>([]);
  const [staffEarning, setStaffEarning] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const y = yearPrefix();
      const [plansRes, slabsRes, branchesRes, runsRes, assignmentsRes] = await Promise.all([
        supabase.from("incentive_plans").select("*").order("created_at", { ascending: false }),
        supabase.from("incentive_slabs").select("plan_id,source_type,rate_type,rate_value,metric,min_threshold,max_threshold"),
        supabase.from("branches").select("id,name"),
        supabase.from("incentive_runs").select("id,plan_id,period_key,total_settlement").like("period_key", `${y}-%`),
        supabase.from("incentive_counselor_plan_assignments").select("counselor_id,plan_id").eq("is_active", true),
      ]);

      const plans = (plansRes.data ?? []) as PlanRow[];
      const slabs = (slabsRes.data ?? []) as SlabRow[];
      const branchMap = new Map(((branchesRes.data ?? []) as { id: string; name: string }[]).map((b) => [b.id, b.name]));

      const payoutByPlan = new Map<string, number>();
      for (const run of (runsRes.data ?? []) as { plan_id: string | null; total_settlement: number }[]) {
        if (!run.plan_id) continue;
        payoutByPlan.set(run.plan_id, (payoutByPlan.get(run.plan_id) ?? 0) + Number(run.total_settlement ?? 0));
      }

      const activePlanIds = new Set(plans.filter((p) => p.is_active).map((p) => p.id));
      const staff = new Set(
        ((assignmentsRes.data ?? []) as { counselor_id: string; plan_id: string }[])
          .filter((a) => activePlanIds.has(a.plan_id))
          .map((a) => a.counselor_id),
      );
      setStaffEarning(staff.size);

      const built = plans.map((plan) =>
        buildIncentivePlanCmsRow({
          plan,
          slabs: slabs.filter((s) => s.plan_id === plan.id),
          branchName: plan.branch_id ? branchMap.get(plan.branch_id) ?? null : null,
          payoutYtd: payoutByPlan.get(plan.id) ?? 0,
        }),
      );
      setRows(built);
    } catch {
      setRows([]);
      setStaffEarning(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(() => incentivePlansCmsKpis(rows, staffEarning), [rows, staffEarning]);

  return { rows, kpis, loading, reload: load };
}
