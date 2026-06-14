import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SalaryRevisionRow } from "../lib/types";

export function useSalaryRevisions(employeeId?: string) {
  return useQuery({
    queryKey: ["hr-salary-revisions", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salary_revision_history" as never)
        .select("*")
        .eq("employee_id", employeeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SalaryRevisionRow[];
    },
  });
}
