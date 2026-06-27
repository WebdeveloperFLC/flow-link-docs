import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "./constants";
import { getHrActorInfo } from "./hrApi";
import type {
  WreDashboardStats,
  WreEvaluationRow,
  WtmPayrollStatus,
  WtmSnapshotRow,
} from "./wreTypes";

export async function fetchWreLatestSnapshot(
  employeeId: string,
  workDate: string,
): Promise<WtmSnapshotRow | null> {
  const { data, error } = await supabase
    .from("wtm_attendance_snapshots" as never)
    .select("*")
    .eq("employee_id", employeeId)
    .eq("work_date", workDate)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as WtmSnapshotRow | null) ?? null;
}

export async function fetchWreSnapshots(params?: {
  from?: string;
  to?: string;
  employeeId?: string;
  limit?: number;
}): Promise<WtmSnapshotRow[]> {
  let q = supabase
    .from("wtm_attendance_snapshots" as never)
    .select("*")
    .eq("org_id", HR_ORG_ID)
    .order("work_date", { ascending: false })
    .order("version", { ascending: false });
  if (params?.from) q = q.gte("work_date", params.from);
  if (params?.to) q = q.lte("work_date", params.to);
  if (params?.employeeId) q = q.eq("employee_id", params.employeeId);
  if (params?.limit) q = q.limit(params.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as WtmSnapshotRow[];
}

export async function fetchWreEvaluations(params?: {
  sessionId?: string;
  employeeId?: string;
  limit?: number;
}): Promise<WreEvaluationRow[]> {
  let q = supabase
    .from("wre_evaluations" as never)
    .select(
      "id, org_id, employee_id, session_id, work_date, trigger, payroll_status, operational_status, late_minutes, early_exit_minutes, overtime_minutes, monthly_late_minutes, remaining_grace_minutes, attendance_policy_version, bundle_version, evaluated_at, evaluated_by_label",
    )
    .eq("org_id", HR_ORG_ID)
    .order("evaluated_at", { ascending: false });
  if (params?.sessionId) q = q.eq("session_id", params.sessionId);
  if (params?.employeeId) q = q.eq("employee_id", params.employeeId);
  if (params?.limit) q = q.limit(params.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as WreEvaluationRow[];
}

export async function wreReevaluate(params: {
  from: string;
  to: string;
  employeeId?: string;
  reason?: string;
  dryRun?: boolean;
}) {
  const actor = await getHrActorInfo();
  const { data, error } = await supabase.rpc("fn_wre_reevaluate" as never, {
    p_org: HR_ORG_ID,
    p_from: params.from,
    p_to: params.to,
    p_employee: params.employeeId ?? null,
    p_reason: params.reason ?? null,
    p_dry_run: params.dryRun ?? true,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
  } as never);
  if (error) throw error;
  return data as { dry_run: boolean; count: number; session_ids?: string[] };
}

export async function fetchWreDashboardStats(monthStart: string, monthEnd: string): Promise<WreDashboardStats> {
  const { data, error } = await supabase
    .from("wtm_attendance_snapshots" as never)
    .select("employee_id, payroll_status, late_minutes, early_exit_minutes, remaining_grace_minutes, work_date")
    .eq("org_id", HR_ORG_ID)
    .gte("work_date", monthStart)
    .lte("work_date", monthEnd);
  if (error) throw error;

  const rows = (data ?? []) as {
    employee_id: string;
    payroll_status: WtmPayrollStatus;
    late_minutes: number;
    early_exit_minutes: number;
    remaining_grace_minutes: number;
    work_date: string;
  }[];

  const latestByEmpDate = new Map<string, typeof rows[0]>();
  for (const r of rows) {
    const key = `${r.employee_id}:${r.work_date}`;
    if (!latestByEmpDate.has(key)) latestByEmpDate.set(key, r);
  }
  const latest = [...latestByEmpDate.values()];

  const byEmpLate = new Map<string, number>();
  const byEmpEarly = new Map<string, number>();
  for (const r of latest) {
    byEmpLate.set(r.employee_id, (byEmpLate.get(r.employee_id) ?? 0) + r.late_minutes);
    if (r.early_exit_minutes > 0) {
      byEmpEarly.set(r.employee_id, (byEmpEarly.get(r.employee_id) ?? 0) + 1);
    }
  }

  let nearGraceLimit = 0;
  let exceedingGrace = 0;
  for (const r of latest) {
    if (r.remaining_grace_minutes <= 5 && r.remaining_grace_minutes > 0) nearGraceLimit += 1;
    if (r.remaining_grace_minutes <= 0 && r.late_minutes > 0) exceedingGrace += 1;
  }

  const frequentLate = [...byEmpLate.values()].filter((m) => m >= 60).length;
  const frequentEarlyExit = [...byEmpEarly.values()].filter((c) => c >= 3).length;

  const summaryMap = new Map<WtmPayrollStatus, number>();
  for (const r of latest) {
    summaryMap.set(r.payroll_status, (summaryMap.get(r.payroll_status) ?? 0) + 1);
  }

  return {
    nearGraceLimit,
    exceedingGrace,
    frequentLate,
    frequentEarlyExit,
    evalSummary: [...summaryMap.entries()].map(([payroll_status, count]) => ({ payroll_status, count })),
  };
}
