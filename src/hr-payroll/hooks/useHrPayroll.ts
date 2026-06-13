import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "../lib/constants";
import type { PayrollLineRow, PayrollCycleRow } from "../lib/types";

export function useHrPayrollLines(cycleId: string | undefined) {
  return useQuery({
    queryKey: ["hr-payroll-lines", HR_ORG_ID, cycleId],
    enabled: !!cycleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_lines" as never)
        .select("*, employees(*, branches(name), companies(name))")
        .eq("org_id", HR_ORG_ID)
        .eq("cycle_id", cycleId!);
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
