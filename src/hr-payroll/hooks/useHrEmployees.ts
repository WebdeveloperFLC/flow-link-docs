import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EMPLOYEE_ACTIVE_STATUSES, HR_ORG_ID } from "../lib/constants";
import type { BranchRow, CompanyRow, DepartmentRow, DesignationRow, EmployeeRow, HrEmployeeCategoryRow, ShiftRow } from "../lib/types";

export type UseHrEmployeesOptions = {
  /** When true, only active employees (excludes Resigned / Terminated). Default true. */
  activeOnly?: boolean;
};

const EMPLOYEE_EMBED_FULL =
  "companies(name, legal_name, currency), branches(name), departments(name), designations(name), hr_employee_categories(code, label, leave_eligible, leave_accrual_eligible), shifts(name, login_time, logout_time, working_days_per_week, timezone)";

const EMPLOYEE_EMBED_NO_CATEGORY =
  "companies(name, legal_name, currency), branches(name), departments(name), designations(name), shifts(name, login_time, logout_time, working_days_per_week, timezone)";

const EMPLOYEE_EMBED_CORE =
  "companies(name, legal_name, currency), branches(name), shifts(name, login_time, logout_time, working_days_per_week, timezone)";

const EMPLOYEE_EMBED_MINIMAL = "branches(name), shifts(name, login_time, logout_time, working_days_per_week, timezone)";

function isEmbedSchemaError(error: { message?: string; code?: string }): boolean {
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST200" ||
    error.code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("relationship") ||
    msg.includes("hr_employee_categories") ||
    msg.includes("designations") ||
    msg.includes("departments")
  );
}

async function fetchEmployeeRows(activeOnly: boolean): Promise<EmployeeRow[]> {
  const embeds = [EMPLOYEE_EMBED_FULL, EMPLOYEE_EMBED_NO_CATEGORY, EMPLOYEE_EMBED_CORE, EMPLOYEE_EMBED_MINIMAL];
  let lastError: { message?: string } | null = null;

  for (const embed of embeds) {
    let query = supabase
      .from("employees" as never)
      .select(`*, ${embed}`)
      .eq("org_id", HR_ORG_ID);
    if (activeOnly) {
      query = query.in("status", [...EMPLOYEE_ACTIVE_STATUSES]);
    }
    const { data, error } = await query.order("full_name");
    if (!error) return (data ?? []) as EmployeeRow[];
    lastError = error;
    if (!isEmbedSchemaError(error)) throw error;
  }

  throw lastError ?? new Error("Unable to load employees");
}

async function fetchEmployeeRow(employeeId: string): Promise<EmployeeRow> {
  const embeds = [EMPLOYEE_EMBED_FULL, EMPLOYEE_EMBED_NO_CATEGORY, EMPLOYEE_EMBED_CORE, EMPLOYEE_EMBED_MINIMAL];
  let lastError: { message?: string } | null = null;

  for (const embed of embeds) {
    const { data, error } = await supabase
      .from("employees" as never)
      .select(`*, ${embed}`)
      .eq("id", employeeId)
      .single();
    if (!error) return data as EmployeeRow;
    lastError = error;
    if (!isEmbedSchemaError(error)) throw error;
  }

  throw lastError ?? new Error("Unable to load employee");
}

export function useHrEmployees(options?: UseHrEmployeesOptions) {
  const activeOnly = options?.activeOnly ?? true;
  return useQuery({
    queryKey: ["hr-employees", HR_ORG_ID, activeOnly],
    queryFn: () => fetchEmployeeRows(activeOnly),
    retry: 1,
  });
}

/** Fresh single-employee fetch (avoids stale list cache for staff_id / CRM link). */
export function useHrEmployee(employeeId: string | undefined) {
  return useQuery({
    queryKey: ["hr-employee", HR_ORG_ID, employeeId],
    enabled: !!employeeId,
    queryFn: () => fetchEmployeeRow(employeeId!),
    retry: 1,
  });
}

export function useHrReferenceData() {
  return useQuery({
    queryKey: ["hr-reference", HR_ORG_ID],
    queryFn: async () => {
      const fetchCompanies = async () => {
        const full = await supabase
          .from("companies" as never)
          .select("id, name, legal_name, currency, country, is_active")
          .eq("org_id", HR_ORG_ID)
          .eq("is_active", true)
          .order("legal_name");
        if (!full.error) return (full.data ?? []) as CompanyRow[];
        const basic = await supabase
          .from("companies" as never)
          .select("id, name, legal_name, currency, country")
          .eq("org_id", HR_ORG_ID)
          .order("name");
        if (basic.error) throw basic.error;
        return (basic.data ?? []) as CompanyRow[];
      };

      const fetchBranches = async () => {
        const active = await supabase
          .from("branches" as never)
          .select("id, name, country")
          .eq("is_active", true)
          .order("display_order");
        if (!active.error) return (active.data ?? []) as BranchRow[];
        const all = await supabase
          .from("branches" as never)
          .select("id, name, country")
          .order("display_order");
        if (all.error) throw all.error;
        return (all.data ?? []) as BranchRow[];
      };

      const fetchDepartments = async () => {
        const active = await supabase
          .from("departments" as never)
          .select("id, name")
          .eq("is_active", true)
          .order("display_order");
        if (!active.error) return (active.data ?? []) as DepartmentRow[];
        const all = await supabase.from("departments" as never).select("id, name").order("name");
        if (all.error) return [] as DepartmentRow[];
        return (all.data ?? []) as DepartmentRow[];
      };

      const fetchDesignations = async () => {
        const active = await supabase
          .from("designations" as never)
          .select("id, name")
          .eq("is_active", true)
          .order("display_order");
        if (!active.error) return (active.data ?? []) as DesignationRow[];
        const all = await supabase.from("designations" as never).select("id, name").order("name");
        if (all.error) return [] as DesignationRow[];
        return (all.data ?? []) as DesignationRow[];
      };

      const [companies, branches, departments, designations, categories, shifts] =
        await Promise.all([
          fetchCompanies(),
          fetchBranches(),
          fetchDepartments(),
          fetchDesignations(),
          supabase
            .from("hr_employee_categories" as never)
            .select(
              "id, code, label, leave_eligible, leave_accrual_eligible, attendance_rules_apply, payroll_rules_apply, is_active, sort_order",
            )
            .eq("org_id", HR_ORG_ID)
            .eq("is_active", true)
            .order("sort_order"),
          supabase
            .from("shifts" as never)
            .select("id, name, login_time, logout_time, working_days_per_week")
            .eq("org_id", HR_ORG_ID),
        ]);

      if (categories.error && !isEmbedSchemaError(categories.error)) throw categories.error;
      if (shifts.error) throw shifts.error;

      return {
        companies,
        branches,
        departments,
        designations,
        categories: (categories.error ? [] : categories.data ?? []) as HrEmployeeCategoryRow[],
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
