import type { HrRole, HrScreenKey } from "./constants";

export type HrPerms = {
  view: boolean;
  apply: boolean;
  approve: boolean;
  override: boolean;
  export: boolean;
  configure: boolean;
  manageEmp: boolean;
};

export type HrRolePermissionRow = {
  id: string;
  org_id: string;
  role: HrRole;
  can_view: boolean;
  can_apply: boolean;
  can_approve: boolean;
  can_override: boolean;
  can_export: boolean;
  can_configure: boolean;
  can_manage_emp: boolean;
  screens: Partial<Record<HrScreenKey, boolean>>;
};

export type EmployeeRow = {
  id: string;
  org_id: string;
  staff_id: string | null;
  emp_code: string;
  full_name: string;
  gender: string | null;
  dob: string | null;
  mobile: string | null;
  email: string | null;
  addr_current: string | null;
  addr_permanent: string | null;
  emergency: string | null;
  photo_url: string | null;
  designation: string | null;
  department: string | null;
  company_id: string | null;
  branch_id: string | null;
  reporting_mgr_id: string | null;
  employment_type: string;
  date_of_joining: string | null;
  notice_period: string | null;
  work_week: string;
  status: string;
  shift_id: string | null;
  monthly_gross: number;
  basic: number;
  hra: number;
  conveyance: number;
  special_allow: number;
  incentive: number;
  bonus: number;
  pf_applicable: boolean;
  pf_number: string | null;
  uan: string | null;
  esic_applicable: boolean;
  esic_number: string | null;
  bank_holder_name: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_branch: string | null;
  bank_account_type: string | null;
  bank_verified: boolean;
  companies?: { name: string } | null;
  branches?: { name: string } | null;
  shifts?: { name: string; login_time: string; logout_time: string } | null;
};

export type CompanyRow = { id: string; name: string };
export type BranchRow = { id: string; name: string };
export type ShiftRow = {
  id: string;
  org_id?: string;
  name: string;
  type?: string;
  login_time: string;
  logout_time: string;
  work_hours?: number;
  grace_min?: number;
  break_min?: number;
  half_day_after_min?: number;
  ot_eligible?: boolean;
};

export type AttendanceRow = {
  id: string;
  org_id: string;
  employee_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  break_start: string | null;
  break_end: string | null;
  break_min: number | null;
  status: string;
  is_mispunch: boolean;
  source: string;
  note: string | null;
};

export type HolidayRow = {
  id: string;
  org_id: string;
  holiday_date: string;
  name: string;
  type: string;
  branch_id: string | null;
  branches?: { name: string } | null;
};

export type LeaveRequestRow = {
  id: string;
  org_id: string;
  employee_id: string;
  type: string;
  from_date: string;
  to_date: string;
  days: number;
  reason: string | null;
  has_document: boolean;
  status: string;
  employees?: { full_name: string; emp_code: string } | null;
};

export type CompoffRequestRow = {
  id: string;
  org_id: string;
  employee_id: string;
  worked_date: string;
  occasion: string | null;
  reason: string | null;
  status: string;
  employees?: { full_name: string } | null;
};

export type LateExemptionRow = {
  id: string;
  org_id: string;
  employee_id: string;
  late_date: string;
  official_in: string;
  actual_in: string;
  delay_min: number;
  reason: string | null;
  status: string;
  employees?: { full_name: string } | null;
};

export type MispunchRequestRow = {
  id: string;
  org_id: string;
  employee_id: string;
  punch_date: string;
  issue: string;
  evidence: string | null;
  status: string;
  employees?: { full_name: string } | null;
};

export type TrainingRecordRow = {
  id: string;
  org_id: string;
  employee_id: string;
  type: string;
  duration: string | null;
  unpaid_days: number;
  start_date: string | null;
  status: string;
  employees?: { full_name: string } | null;
};

export type PayrollLineRow = {
  id: string;
  org_id: string;
  cycle_id: string;
  employee_id: string;
  payroll_days: number;
  monthly_gross: number;
  basic: number;
  leaves_taken: number;
  paid_leaves: number;
  comp_off: number;
  late_count: number;
  mispunch_count: number;
  ul_count: number;
  sandwich_count: number;
  unpaid_training: number;
  late_deduction: number;
  mispunch_deduction: number;
  payable_days: number;
  daily_rate: number;
  gross_earned: number;
  incentive: number;
  bonus: number;
  pf_employee: number;
  esic_employee: number;
  net_salary: number;
  is_overridden: boolean;
  override_json: Record<string, unknown> | null;
  employees?: EmployeeRow | null;
};

export type AuditLogRow = {
  id: string;
  org_id: string;
  actor_label: string | null;
  action: string;
  target: string | null;
  prev_value: string | null;
  new_value: string | null;
  created_at: string;
};

export type PolicyRow = {
  id: string;
  org_id: string;
  domain: string;
  effective_from: string;
  version: number;
  config: Record<string, unknown>;
};

export type LeaveBalanceRow = {
  id: string;
  employee_id: string;
  policy_year: number;
  type: string;
  entitled: number;
  accrued: number;
  taken: number;
};

export type EmployeeDocumentRow = {
  id: string;
  employee_id: string;
  doc_type: string;
  file_name: string | null;
  storage_path: string | null;
  mime: string | null;
};

export type PayrollComputeResult = {
  late_deduction: number;
  mispunch_deduction: number;
  payable_days: number;
  daily_rate: number;
  gross_earned: number;
  pf_employee: number;
  esic_employee: number;
  incentive: number;
  bonus: number;
  net_salary: number;
};

export type PayrollCycleRow = {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  payroll_days: number;
  status: string;
};
