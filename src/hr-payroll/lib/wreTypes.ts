export type WtmPayrollStatus =
  | "Present"
  | "Half Day"
  | "Absent"
  | "Paid Leave"
  | "Unpaid Leave"
  | "Holiday"
  | "Weekly Off";

export type WreEvalTrigger =
  | "clock_out"
  | "aems_correction"
  | "manual_reeval"
  | "policy_change"
  | "calendar_change";

export type WreEvaluationRow = {
  id: string;
  org_id: string;
  employee_id: string;
  session_id: string | null;
  work_date: string;
  trigger: WreEvalTrigger;
  payroll_status: WtmPayrollStatus;
  operational_status: string;
  late_minutes: number;
  early_exit_minutes: number;
  overtime_minutes: number;
  monthly_late_minutes: number;
  remaining_grace_minutes: number;
  attendance_policy_version: number | null;
  bundle_version: number | null;
  evaluated_at: string;
  evaluated_by_label: string | null;
};

export type WtmSnapshotRow = {
  id: string;
  org_id: string;
  session_id: string;
  employee_id: string;
  work_date: string;
  evaluation_id: string;
  version: number;
  clock_in: string | null;
  clock_out: string | null;
  working_duration_min: number;
  break_duration_min: number;
  late_minutes: number;
  early_exit_minutes: number;
  overtime_minutes: number;
  monthly_late_minutes: number;
  remaining_grace_minutes: number;
  payroll_status: WtmPayrollStatus;
  operational_status: string;
  is_mispunch: boolean;
  attendance_policy_version: number | null;
  snapshot_at: string;
};

export const WTM_PAYROLL_STATUS_LABEL: Record<WtmPayrollStatus, string> = {
  Present: "Present",
  "Half Day": "Half Day",
  Absent: "Absent",
  "Paid Leave": "Paid Leave",
  "Unpaid Leave": "Unpaid Leave",
  Holiday: "Holiday",
  "Weekly Off": "Weekly Off",
};

export type WreDashboardStats = {
  nearGraceLimit: number;
  exceedingGrace: number;
  frequentLate: number;
  frequentEarlyExit: number;
  evalSummary: { payroll_status: WtmPayrollStatus; count: number }[];
};
