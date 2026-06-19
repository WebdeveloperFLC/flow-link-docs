import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EmployeeAssetRow } from "../lib/types";

export function useEmployeeAssets(employeeId?: string) {
  return useQuery({
    queryKey: ["hr-employee-assets", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_assets" as never)
        .select("*")
        .eq("employee_id", employeeId!)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EmployeeAssetRow[];
    },
  });
}
