import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "../lib/constants";
import type { PayrollCycleRow, PayrollLineRow, PayrollPreviewRow } from "../lib/types";

export function useHrPayrollLines(cycleId: string | undefined) {
  return useQuery({
    queryKey: ["hr-payroll-lines", HR_ORG_ID, cycleId],
    enabled: !!cycleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_lines" as never)
        .select("*, employees(*, branches(name), companies(name, currency))")
        .eq("org_id", HR_ORG_ID)
        .eq("cycle_id", cycleId!);
      if (error) throw error;
      return (data ?? []) as PayrollLineRow[];
    },
  });
}

/** Payroll lines for one or more cycles (verify page historical / multi-cycle views). */
export function useHrPayrollLinesMulti(cycleIds: string[]) {
  const stableKey = [...cycleIds].sort().join(",");
  return useQuery({
    queryKey: ["hr-payroll-lines", HR_ORG_ID, "multi", stableKey],
    enabled: cycleIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_lines" as never)
        .select("*, employees(*, branches(name), companies(name, currency))")
        .eq("org_id", HR_ORG_ID)
        .in("cycle_id", cycleIds);
      if (error) throw error;
      return (data ?? []) as PayrollLineRow[];
    },
  });
}

export function useHrPayrollLine(employeeId: string | undefined, cycleId: string | undefined) {
  return useQuery({
    queryKey: ["hr-payroll-line", employeeId, cycleId],
    enabled: !!employeeId && !!cycleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_lines" as never)
        .select("*")
        .eq("employee_id", employeeId!)
        .eq("cycle_id", cycleId!)
        .maybeSingle();
      if (error) throw error;
      return data as PayrollLineRow | null;
    },
  });
}

export function useHrPayrollPreview(cycleId: string | undefined) {
  return useQuery({
    queryKey: ["hr-payroll-preview", HR_ORG_ID, cycleId],
    enabled: !!cycleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_payroll_preview" as never)
        .select("*")
        .eq("org_id", HR_ORG_ID)
        .eq("cycle_id", cycleId!);
      if (error) throw error;
      return (data ?? []) as PayrollPreviewRow[];
    },
  });
}

export function useHrCycles() {
  return useQuery({
    queryKey: ["hr-cycles", HR_ORG_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_cycles" as never)
        .select("*")
        .eq("org_id", HR_ORG_ID)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PayrollCycleRow[];
    },
  });
}

export type EmployeePayrollHistoryLine = PayrollLineRow & {
  payroll_cycles?: Pick<PayrollCycleRow, "label" | "status" | "start_date" | "end_date"> | null;
};

/** Recent payroll lines for one employee (Employee 360 history). */
export function useHrEmployeePayrollHistory(employeeId: string | undefined) {
  return useQuery({
    queryKey: ["hr-emp-payroll-history", HR_ORG_ID, employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_lines" as never)
        .select("*, payroll_cycles(label, status, start_date, end_date)")
        .eq("org_id", HR_ORG_ID)
        .eq("employee_id", employeeId!)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as EmployeePayrollHistoryLine[];
    },
  });
}

export async function rpcComputePayroll(args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc("fn_compute_payroll" as never, args as never);
  if (error) throw error;
  return data as Record<string, number>;
}

export async function rpcRollupInputs(employeeId: string, cycleId: string) {
  const { data, error } = await supabase.rpc("fn_rollup_inputs" as never, {
    p_employee: employeeId,
    p_cycle: cycleId,
  } as never);
  if (error) throw error;
  return data as Record<string, number>;
}
