import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "../lib/constants";
import type { BranchRow, CompanyRow, EmployeeRow, ShiftRow } from "../lib/types";

export function useHrEmployees() {
  return useQuery({
    queryKey: ["hr-employees", HR_ORG_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees" as never)
        .select(
          "*, companies(name, legal_name, currency), branches(name), shifts(name, login_time, logout_time, working_days_per_week)",
        )
        .eq("org_id", HR_ORG_ID)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as EmployeeRow[];
    },
  });
}

export function useHrReferenceData() {
  return useQuery({
    queryKey: ["hr-reference", HR_ORG_ID],
    queryFn: async () => {
      const [companies, branches, shifts] = await Promise.all([
        supabase.from("companies" as never).select("id, name, legal_name, currency").eq("org_id", HR_ORG_ID),
        supabase.from("branches" as never).select("id, name").eq("is_active", true).order("display_order"),
        supabase
          .from("shifts" as never)
          .select("id, name, login_time, logout_time, working_days_per_week")
          .eq("org_id", HR_ORG_ID),
      ]);
      if (companies.error) throw companies.error;
      if (branches.error) throw branches.error;
      if (shifts.error) throw shifts.error;
      return {
        companies: (companies.data ?? []) as CompanyRow[],
        branches: (branches.data ?? []) as BranchRow[],
        shifts: (shifts.data ?? []) as ShiftRow[],
      };
    },
  });
}

export async function fetchNextEmpCode(): Promise<string> {
  const { data } = await supabase
    .from("employees" as never)
    .select("emp_code")
    .eq("org_id", HR_ORG_ID)
    .order("emp_code", { ascending: false })
    .limit(1);
  const rows = (data ?? []) as { emp_code: string }[];
  if (!rows.length) return "FL-1048";
  const n = parseInt(rows[0].emp_code.replace(/\D/g, ""), 10);
  return `FL-${n + 1}`;
}
