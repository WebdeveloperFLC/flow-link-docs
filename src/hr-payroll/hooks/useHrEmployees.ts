import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EMPLOYEE_ACTIVE_STATUSES, HR_ORG_ID } from "../lib/constants";
import type { BranchRow, CompanyRow, DepartmentRow, DesignationRow, EmployeeRow, HrEmployeeCategoryRow, ShiftRow } from "../lib/types";

export type UseHrEmployeesOptions = {
  /** When true, only active employees (excludes Resigned / Terminated). Default true. */
  activeOnly?: boolean;
};

export function useHrEmployees(options?: UseHrEmployeesOptions) {
  const activeOnly = options?.activeOnly ?? true;
  return useQuery({
    queryKey: ["hr-employees", HR_ORG_ID, activeOnly],
    queryFn: async () => {
      let query = supabase
        .from("employees" as never)
        .select(
          "*, companies(name, legal_name, currency), branches(name), departments(name), designations(name), hr_employee_categories(code, label, leave_eligible, leave_accrual_eligible), shifts(name, login_time, logout_time, working_days_per_week, timezone)",
        )
        .eq("org_id", HR_ORG_ID);
      if (activeOnly) {
        query = query.in("status", [...EMPLOYEE_ACTIVE_STATUSES]);
      }
      const { data, error } = await query.order("full_name");
      if (error) throw error;
      return (data ?? []) as EmployeeRow[];
    },
  });
}

/** Fresh single-employee fetch (avoids stale list cache for staff_id / CRM link). */
export function useHrEmployee(employeeId: string | undefined) {
  return useQuery({
    queryKey: ["hr-employee", HR_ORG_ID, employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees" as never)
        .select(
          "*, companies(name, legal_name, currency), branches(name), departments(name), designations(name), hr_employee_categories(code, label, leave_eligible, leave_accrual_eligible), shifts(name, login_time, logout_time, working_days_per_week, timezone)",
        )
        .eq("id", employeeId!)
        .single();
      if (error) throw error;
      return data as EmployeeRow;
    },
  });
}

export function useHrReferenceData() {
  return useQuery({
    queryKey: ["hr-reference", HR_ORG_ID],
    queryFn: async () => {
      const [companies, branches, departments, designations, categories, shifts] = await Promise.all([
        supabase
          .from("companies" as never)
          .select("id, name, legal_name, currency, country, is_active")
          .eq("org_id", HR_ORG_ID)
          .eq("is_active", true)
          .order("legal_name"),
        supabase.from("branches" as never).select("id, name, country").eq("is_active", true).order("display_order"),
        supabase.from("departments" as never).select("id, name").eq("is_active", true).order("display_order"),
        supabase.from("designations" as never).select("id, name").eq("is_active", true).order("display_order"),
        supabase
          .from("hr_employee_categories" as never)
          .select("id, code, label, leave_eligible, leave_accrual_eligible, attendance_rules_apply, payroll_rules_apply, is_active, sort_order")
          .eq("org_id", HR_ORG_ID)
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("shifts" as never)
          .select("id, name, login_time, logout_time, working_days_per_week")
          .eq("org_id", HR_ORG_ID),
      ]);
      if (companies.error) throw companies.error;
      if (branches.error) throw branches.error;
      if (departments.error) throw departments.error;
      if (designations.error) throw designations.error;
      if (categories.error) throw categories.error;
      if (shifts.error) throw shifts.error;
      return {
        companies: (companies.data ?? []) as CompanyRow[],
        branches: (branches.data ?? []) as BranchRow[],
        departments: (departments.data ?? []) as DepartmentRow[],
        designations: (designations.data ?? []) as DesignationRow[],
        categories: (categories.data ?? []) as HrEmployeeCategoryRow[],
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
