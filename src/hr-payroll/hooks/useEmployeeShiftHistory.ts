import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "../lib/constants";
import type { EmployeeShiftHistoryRow } from "../lib/types";

type Options = {
  employeeId?: string;
  shiftId?: string;
  limit?: number;
};

export function useEmployeeShiftHistory(options?: Options) {
  const employeeId = options?.employeeId;
  const shiftId = options?.shiftId;
  const limit = options?.limit ?? 200;

  return useQuery({
    queryKey: ["hr-employee-shift-history", HR_ORG_ID, employeeId, shiftId, limit],
    queryFn: async () => {
      let q = supabase
        .from("employee_shift_history" as never)
        .select(
          "id, org_id, employee_id, shift_id, effective_from, effective_to, changed_by, change_reason, created_at, employees(full_name, emp_code), shifts(name, login_time, logout_time, type)",
        )
        .eq("org_id", HR_ORG_ID)
        .order("effective_from", { ascending: false })
        .limit(limit);

      if (employeeId) q = q.eq("employee_id", employeeId);
      if (shiftId) q = q.eq("shift_id", shiftId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as EmployeeShiftHistoryRow[];
    },
  });
}
