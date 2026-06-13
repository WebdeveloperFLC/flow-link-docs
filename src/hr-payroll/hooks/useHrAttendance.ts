import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "../lib/constants";
import type { AttendanceRow } from "../lib/types";

export function useHrAttendance(employeeId: string | undefined, cycleStart?: string, cycleEnd?: string) {
  return useQuery({
    queryKey: ["hr-attendance", HR_ORG_ID, employeeId, cycleStart, cycleEnd],
    enabled: !!employeeId,
    queryFn: async () => {
      let q = supabase
        .from("attendance" as never)
        .select("*")
        .eq("org_id", HR_ORG_ID)
        .eq("employee_id", employeeId!)
        .order("work_date");
      if (cycleStart) q = q.gte("work_date", cycleStart);
      if (cycleEnd) q = q.lte("work_date", cycleEnd);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AttendanceRow[];
    },
  });
}
