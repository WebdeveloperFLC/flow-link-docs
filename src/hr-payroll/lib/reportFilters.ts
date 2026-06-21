import {
  EMPLOYEE_ACTIVE_STATUSES,
  EMPLOYEE_INACTIVE_STATUSES,
} from "./constants";
import {
  employmentTypeLabel,
  type Emp360Filters,
  type Emp360FilterOptions,
} from "./emp360Filters";
import { isEmployeeActive, isEmployeeInactive } from "./format";
import type { EmployeeRow, HrEmployeeCategoryRow } from "./types";

export type ReportExtraFilters = {
  status: string;
  employeeId: string;
  recordStatus: string;
  cycleId: string;
  auditModule: string;
  auditUser: string;
  holidayType: string;
  workWeek: string;
  categoryId: string;
};

export type HrReportFilters = Emp360Filters & ReportExtraFilters;

export const REPORT_EXTRA_KEYS = [
  "status",
  "employee",
  "recordStatus",
  "cycle",
  "auditModule",
  "auditUser",
  "holidayType",
  "workWeek",
  "category",
] as const;

export const EMPLOYEE_STATUS_FILTER_OPTIONS = [
  "All",
  ...EMPLOYEE_ACTIVE_STATUSES,
  ...EMPLOYEE_INACTIVE_STATUSES,
] as const;

export const RECORD_STATUS_OPTIONS = ["All", "Pending", "Approved", "Rejected", "Cancelled"] as const;

export function defaultReportExtraFilters(): ReportExtraFilters {
  return {
    status: "All",
    employeeId: "All",
    recordStatus: "All",
    cycleId: "All",
    auditModule: "All",
    auditUser: "All",
    holidayType: "All",
    workWeek: "All",
    categoryId: "All",
  };
}

export function defaultHrReportFilters(): HrReportFilters {
  return {
    country: "All",
    branch: "All",
    company: "All",
    department: "All",
    designation: "All",
    employment: "All",
    search: "",
    ...defaultReportExtraFilters(),
  };
}

export function reportExtraFromSearchParams(params: URLSearchParams): ReportExtraFilters {
  const d = defaultReportExtraFilters();
  const status = params.get("status");
  const employee = params.get("employee");
  const recordStatus = params.get("recordStatus");
  const cycle = params.get("cycle");
  const auditModule = params.get("auditModule");
  const auditUser = params.get("auditUser");
  const holidayType = params.get("holidayType");
  const workWeek = params.get("workWeek");
  const category = params.get("category");
  if (status) d.status = status;
  if (employee) d.employeeId = employee;
  if (recordStatus) d.recordStatus = recordStatus;
  if (cycle) d.cycleId = cycle;
  if (auditModule) d.auditModule = auditModule;
  if (auditUser) d.auditUser = auditUser;
  if (holidayType) d.holidayType = holidayType;
  if (workWeek) d.workWeek = workWeek;
  if (category) d.categoryId = category;
  return d;
}

export function reportExtraToSearchParams(extra: ReportExtraFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (extra.status !== "All") p.set("status", extra.status);
  if (extra.employeeId !== "All") p.set("employee", extra.employeeId);
  if (extra.recordStatus !== "All") p.set("recordStatus", extra.recordStatus);
  if (extra.cycleId !== "All") p.set("cycle", extra.cycleId);
  if (extra.auditModule !== "All") p.set("auditModule", extra.auditModule);
  if (extra.auditUser !== "All") p.set("auditUser", extra.auditUser);
  if (extra.holidayType !== "All") p.set("holidayType", extra.holidayType);
  if (extra.workWeek !== "All") p.set("workWeek", extra.workWeek);
  if (extra.categoryId !== "All") p.set("category", extra.categoryId);
  return p;
}

export function mergeHrReportFilters(
  emp360: Emp360Filters,
  extra: ReportExtraFilters,
): HrReportFilters {
  return { ...emp360, ...extra };
}

export type ReportCategoryOption = { id: string; label: string };

export function collectCategoryOptions(
  employees: EmployeeRow[],
  masters?: HrEmployeeCategoryRow[],
): ReportCategoryOption[] {
  const map = new Map<string, string>();
  for (const e of employees) {
    if (e.employee_category_id && e.hr_employee_categories?.label) {
      map.set(e.employee_category_id, e.hr_employee_categories.label);
    }
  }
  for (const c of masters ?? []) {
    map.set(c.id, c.label);
  }
  return [...map.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function collectEmployeeOptions(employees: EmployeeRow[]) {
  return employees
    .map((e) => ({
      id: e.id,
      label: `${e.full_name} (${e.emp_code})`,
      empCode: e.emp_code,
      name: e.full_name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function collectWorkWeekOptions(employees: EmployeeRow[]) {
  const set = new Set<string>();
  for (const e of employees) {
    const ww = e.work_week?.trim();
    if (ww) set.add(ww);
  }
  return [...set].sort();
}

export function sanitizeReportExtraFilters(
  extra: ReportExtraFilters,
  options: {
    employees: ReportCategoryOption[];
    categories: ReportCategoryOption[];
    cycles: ReportCategoryOption[];
    auditUsers: string[];
    auditModules: string[];
    workWeeks: string[];
  },
): ReportExtraFilters {
  const next = { ...extra };
  if (
    next.employeeId !== "All" &&
    !options.employees.some((o) => o.id === next.employeeId)
  ) {
    next.employeeId = "All";
  }
  if (
    next.categoryId !== "All" &&
    !options.categories.some((o) => o.id === next.categoryId)
  ) {
    next.categoryId = "All";
  }
  if (
    next.cycleId !== "All" &&
    !options.cycles.some((o) => o.id === next.cycleId)
  ) {
    next.cycleId = "All";
  }
  if (next.auditUser !== "All" && !options.auditUsers.includes(next.auditUser)) {
    next.auditUser = "All";
  }
  if (next.auditModule !== "All" && !options.auditModules.includes(next.auditModule)) {
    next.auditModule = "All";
  }
  if (next.workWeek !== "All" && !options.workWeeks.includes(next.workWeek)) {
    next.workWeek = "All";
  }
  return next;
}

export function filterEmployeesForReport(
  employees: EmployeeRow[],
  filters: HrReportFilters,
  options?: Emp360FilterOptions,
): EmployeeRow[] {
  const q = filters.search.trim().toLowerCase();
  return employees.filter((e) => {
    if (filters.country !== "All" && (e.payroll_country ?? "IN").toUpperCase() !== filters.country) {
      return false;
    }
    if (filters.branch !== "All" && e.branch_id !== filters.branch) return false;
    if (filters.company !== "All" && e.company_id !== filters.company) return false;
    if (filters.department !== "All" && e.department_id !== filters.department) return false;
    if (filters.designation !== "All" && e.designation_id !== filters.designation) return false;
    if (filters.categoryId !== "All" && e.employee_category_id !== filters.categoryId) return false;
    if (filters.employment !== "All" && employmentTypeLabel(e) !== filters.employment) return false;
    if (filters.workWeek !== "All" && e.work_week !== filters.workWeek) return false;
    if (filters.employeeId !== "All" && e.id !== filters.employeeId) return false;
    if (filters.status !== "All" && e.status !== filters.status) return false;
    if (!q) return true;
    return (
      e.full_name.toLowerCase().includes(q) ||
      e.emp_code.toLowerCase().includes(q) ||
      (e.email ?? "").toLowerCase().includes(q) ||
      (e.mobile ?? "").includes(q)
    );
  });
}

export function dateInRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

export function auditModuleFromAction(action: string): string {
  const a = action.toLowerCase();
  if (a.includes("leave")) return "Leave";
  if (a.includes("attendance") || a.includes("punch")) return "Attendance";
  if (a.includes("payroll") || a.includes("salary")) return "Payroll";
  if (a.includes("employee") || a.includes("staff")) return "Employee";
  if (a.includes("training")) return "Training";
  if (a.includes("holiday")) return "Holiday";
  if (a.includes("approval")) return "Approval";
  return "Other";
}

export function employeeSummaryCounts(employees: EmployeeRow[]) {
  let active = 0;
  let inactive = 0;
  let probation = 0;
  let confirmed = 0;
  for (const e of employees) {
    if (isEmployeeInactive(e.status)) inactive += 1;
    else if (isEmployeeActive(e.status)) active += 1;
    if (e.status === "On Probation") probation += 1;
    if (e.status === "Confirmed") confirmed += 1;
  }
  return {
    total: employees.length,
    active,
    inactive,
    probation,
    confirmed,
  };
}
