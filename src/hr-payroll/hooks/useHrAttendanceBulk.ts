import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "../lib/constants";
import type { AttendanceRow } from "../lib/types";

export function useHrAttendanceBulk(
  from: string | undefined,
  to: string | undefined,
  employeeIds: string[] | undefined,
) {
  const ids = employeeIds ?? [];
  const enabled = !!from && !!to && ids.length > 0;

  return useQuery({
    queryKey: ["hr-attendance-bulk", HR_ORG_ID, from, to, ids],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance" as never)
        .select("*")
        .eq("org_id", HR_ORG_ID)
        .gte("work_date", from!)
        .lte("work_date", to!)
        .in("employee_id", ids)
        .order("work_date", { ascending: false })
        .order("employee_id");
      if (error) throw error;
      return (data ?? []) as AttendanceRow[];
    },
  });
}
