import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EMPLOYEE_ACTIVE_STATUSES, HR_ORG_ID } from "../lib/constants";
import type { ShiftRow } from "../lib/types";

export function useHrShifts() {
  return useQuery({
    queryKey: ["hr-shifts", HR_ORG_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts" as never)
        .select("*")
        .eq("org_id", HR_ORG_ID)
        .order("name");
      if (error) throw error;
      return (data ?? []) as ShiftRow[];
    },
  });
}

export function useShiftEmployeeCounts() {
  return useQuery({
    queryKey: ["hr-shift-counts", HR_ORG_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees" as never)
        .select("shift_id")
        .eq("org_id", HR_ORG_ID)
        .in("status", [...EMPLOYEE_ACTIVE_STATUSES]);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as { shift_id: string | null }[]) {
        if (row.shift_id) counts[row.shift_id] = (counts[row.shift_id] ?? 0) + 1;
      }
      return counts;
    },
  });
}
