import { emp360FiltersToSearchParams, type Emp360Filters } from "./emp360Filters";

/** Build search string preserving list filters only (no shared date range). */
export function emp360ProfileSearch(listFilters?: Emp360Filters): string {
  if (!listFilters) return "";
  const q = emp360FiltersToSearchParams(listFilters).toString();
  return q ? `?${q}` : "";
}

export function emp360ProfilePath(employeeId: string, search?: string) {
  return `/hr/employee/${employeeId}${search ?? ""}`;
}

export type Emp360DetailSection =
  | "attendance"
  | "leaves"
  | "payroll"
  | "training"
  | "documents"
  | "policy-bundle";

export function emp360DetailPath(
  employeeId: string,
  section: Emp360DetailSection,
  search?: string,
) {
  return `/hr/employee/${employeeId}/${section}${search ?? ""}`;
}

export const EMP360_DETAIL_LABELS: Record<Emp360DetailSection, string> = {
  attendance: "Attendance",
  leaves: "Leave history",
  payroll: "Payroll history",
  training: "Training history",
  documents: "Documents",
  "policy-bundle": "Policy bundle",
};
