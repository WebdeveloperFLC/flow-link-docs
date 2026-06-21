import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "../lib/constants";
import type { HrEmployeeCategoryRow } from "../lib/types";

export function useHrEmployeeCategories(activeOnly = true) {
  return useQuery({
    queryKey: ["hr-employee-categories", HR_ORG_ID, activeOnly],
    queryFn: async () => {
      let q = supabase
        .from("hr_employee_categories" as never)
        .select("*")
        .eq("org_id", HR_ORG_ID)
        .order("sort_order");
      if (activeOnly) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as HrEmployeeCategoryRow[];
    },
  });
}
