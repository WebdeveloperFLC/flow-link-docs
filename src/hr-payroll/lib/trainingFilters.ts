import type { TrainingRecordRow } from "./types";

export const TRAINING_COMPLETION_REASONS = [
  "Successfully completed",
  "Completed before extension date",
  "Training objective achieved",
  "Performance satisfactory",
  "Other",
] as const;

export const TRAINING_STATUS_OPTIONS = [
  "All",
  "In Progress",
  "Extended",
  "Pending Manager Approval",
  "Pending HR Approval",
  "Completed",
  "Rejected",
  "Cancelled",
] as const;

export type TrainingFilters = {
  branch: string;
  department: string;
  employeeId: string;
  status: string;
  from: string;
  to: string;
  search: string;
};

export function defaultTrainingFilters(): TrainingFilters {
  return {
    branch: "All",
    department: "All",
    employeeId: "All",
    status: "All",
    from: "",
    to: "",
    search: "",
  };
}

export function trainingEffectiveEnd(row: TrainingRecordRow): string | null {
  return row.extended_end_date ?? row.end_date ?? null;
}

export function filterTrainingRecords(
  rows: TrainingRecordRow[],
  filters: TrainingFilters,
): TrainingRecordRow[] {
  const q = filters.search.trim().toLowerCase();
  return rows.filter((t) => {
    const emp = t.employees;
    if (filters.branch !== "All" && emp?.branch_id !== filters.branch) return false;
    if (filters.department !== "All" && emp?.department_id !== filters.department) return false;
    if (filters.employeeId !== "All" && t.employee_id !== filters.employeeId) return false;
    if (filters.status !== "All" && t.status !== filters.status) return false;

    const start = t.start_date ?? "";
    if (filters.from && start && start < filters.from) return false;
    if (filters.to && start && start > filters.to) return false;

    if (!q) return true;
    const ref = (t.training_ref ?? t.id.slice(0, 8)).toLowerCase();
    return (
      (emp?.full_name ?? "").toLowerCase().includes(q) ||
      (emp?.emp_code ?? "").toLowerCase().includes(q) ||
      ref.includes(q) ||
      t.type.toLowerCase().includes(q)
    );
  });
}

export function formatTrainingAuditWhen(ts: string | null | undefined): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return ts;
  }
}
