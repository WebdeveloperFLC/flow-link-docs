import type { HrRole, HrScreenKey } from "./constants";
import type { SecurityChequeStatus } from "./securityCheque";

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

/** CRM staff row from fn_list_crm_staff (Phase 8 Team integration). */
export type CrmStaffRow = {
  staff_id: string;
  email: string | null;
  full_name: string;
  profile_status: string;
  crm_roles: string[];
  hr_role: HrRole | null;
  hr_assignment_id: string | null;
  scope_branch_id: string | null;
  profile_branch_id: string | null;
  branch_name: string | null;
  employee_id: string | null;
  emp_code: string | null;
  employee_name: string | null;
};

export type EmployeeDocumentRow = {
  id: string;
  org_id: string;
  employee_id: string;
  doc_type: string;
  file_name: string | null;
  storage_path: string | null;
  mime: string | null;
  verification_status?: string;
  remarks?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at?: string;
};

export type HrDocumentTypeRow = {
  id: string;
  org_id: string;
  label: string;
  code: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type HrEmployeeCategoryRow = {
  id: string;
  org_id: string;
  code: string;
  label: string;
  leave_eligible: boolean;
  leave_accrual_eligible: boolean;
  attendance_rules_apply: boolean;
  payroll_rules_apply: boolean;
  is_active: boolean;
  sort_order: number;
};

export type DepartmentRow = { id: string; name: string };
export type DesignationRow = { id: string; name: string };

export type EmployeeRow = {
  id: string;
  org_id: string;
  staff_id: string | null;
  emp_code: string;
  full_name: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  gender: string | null;
  dob: string | null;
  /** Personal mobile (employee-owned SSOT). */
  mobile: string | null;
  /** Personal email (employee-owned SSOT). */
  email: string | null;
  alternate_personal_mobile?: string | null;
  home_telephone?: string | null;
  company_email?: string | null;
  company_mobile?: string | null;
  extension_number?: string | null;
  direct_office_number?: string | null;
  company_emergency_contact_person?: string | null;
  company_emergency_contact_number?: string | null;
  company_emergency_contact_email?: string | null;
  addr_current: string | null;
  addr_permanent: string | null;
  emergency: string | null;
  emergency_contacts?: EmergencyContact[] | null;
  marital_status?: string | null;
  blood_group?: string | null;
  nationality?: string | null;
  photo_url: string | null;
  designation: string | null;
  designation_id?: string | null;
  department: string | null;
  department_id?: string | null;
  employee_category_id?: string | null;
  company_id: string | null;
  branch_id: string | null;
  reporting_mgr_id: string | null;
  /** @deprecated Legacy DB column — use employee_category_id / hr_employee_categories instead. */
  employment_type?: string | null;
  date_of_joining: string | null;
  notice_period: string | null;
  probation_start_date?: string | null;
  probation_end_date?: string | null;
  exit_date?: string | null;
  exit_reason?: string | null;
  rehire_eligible?: boolean | null;
  work_week: string;
  status: string;
  shift_id: string | null;
  salary_currency?: string;
  payroll_country?: string;
  monthly_gross: number;
  /** Monthly | Daily | Hourly — wage interpretation for estimated payroll. */
  pay_basis?: string | null;
  /** CTC / salary package — optional; UI falls back to monthly_gross. */
  salary_package?: number | null;
  basic: number;
  hra: number;
  conveyance: number;
  special_allow: number;
  bonus_percentage?: number | null;
  other_allowances?: number | null;
  incentive: number;
  bonus: number;
  pf_applicable: boolean;
  has_pf_account?: boolean;
  has_esic_account?: boolean;
  employer_pf_applicable?: boolean;
  employer_esic_applicable?: boolean;
  employee_pf_pct?: number | null;
  employer_pf_pct?: number | null;
  employee_esic_pct?: number | null;
  employer_esic_pct?: number | null;
  professional_tax_amount?: number | null;
  pf_number: string | null;
  uan: string | null;
  esic_applicable: boolean;
  esic_number: string | null;
  pt_applicable?: boolean;
  tds_applicable?: boolean;
  lwf_applicable?: boolean;
  other_deductions?: number;
  bank_holder_name: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_branch: string | null;
  bank_account_type: string | null;
  bank_verified: boolean;
  bank_verified_by?: string | null;
  bank_verified_at?: string | null;
  security_cheque_status?: SecurityChequeStatus;
  security_cheque_reason?: string | null;
  security_cheque_storage_path?: string | null;
  security_cheque_file_name?: string | null;
  security_cheque_uploaded_at?: string | null;
  security_cheque_uploaded_by?: string | null;
  security_cheque_uploaded_by_label?: string | null;
  companies?: { name: string; legal_name?: string | null; currency?: string } | null;
  branches?: { name: string } | null;
  departments?: { name: string } | null;
  designations?: { name: string } | null;
  hr_employee_categories?: Pick<HrEmployeeCategoryRow, "code" | "label" | "leave_eligible" | "leave_accrual_eligible"> | null;
  shifts?: { name: string; login_time: string; logout_time: string; working_days_per_week?: number; timezone?: string } | null;
};

export type EmergencyContact = { name: string; phone: string; relation: string; email?: string };

export type EmployeeAssetRow = {
  id: string;
  org_id: string;
  employee_id: string;
  asset_type: string;
  asset_type_other: string | null;
  asset_name: string | null;
  model_number: string | null;
  serial_number: string | null;
  asset_tag: string | null;
  mac_address: string | null;
  imei_number: string | null;
  service_provider: string | null;
  mobile_number: string | null;
  sim_number: string | null;
  remarks: string | null;
  issue_date: string;
  issued_by_employee_id: string | null;
  issued_by_label: string;
  asset_status: string;
  return_date: string | null;
  collected_by_employee_id: string | null;
  collected_by_label: string | null;
  asset_condition: string | null;
  return_remarks: string | null;
  accessories: string[];
  accessory_other: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyRow = {
  id: string;
  name: string;
  legal_name?: string | null;
  currency?: string;
  country?: string;
  is_active?: boolean;
};
export type BranchRow = { id: string; name: string; country?: string | null };
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
  full_day_after_min?: number;
  break_window_start?: string | null;
  break_window_end?: string | null;
  max_break_min?: number;
  ot_eligible?: boolean;
  working_days_per_week?: number;
  timezone?: string;
};

export type EmployeeShiftHistoryRow = {
  id: string;
  org_id: string;
  employee_id: string;
  shift_id: string;
  effective_from: string;
  effective_to: string | null;
  changed_by: string | null;
  change_reason: string | null;
  created_at: string;
  employees?: { full_name: string; emp_code: string } | null;
  shifts?: Pick<ShiftRow, "name" | "login_time" | "logout_time" | "type"> | null;
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
  ess_unavailable?: boolean;
  shift_work_min?: number;
  off_shift_min?: number;
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
  branch_ids?: string[] | null;
  applicable_tags?: string[] | null;
  branches?: { name: string; country?: string | null } | null;
};

export type LeaveRequestRow = {
  id: string;
  org_id: string;
  employee_id: string;
  type: string;
  from_date: string;
  to_date: string;
  days: number;
  duration_type?: string | null;
  half_day_part?: string | null;
  reason: string | null;
  has_document: boolean;
  document_id?: string | null;
  status: string;
  rejection_reason?: string | null;
  cancelled_at?: string | null;
  employees?: { full_name: string; emp_code: string } | null;
  employee_documents?: { file_name: string; storage_path: string } | null;
};

export type CompoffRequestRow = {
  id: string;
  org_id: string;
  employee_id: string;
  worked_date: string;
  occasion: string | null;
  reason: string | null;
  status: string;
  duration_type?: string | null;
  partial_start?: string | null;
  partial_end?: string | null;
  comp_off_leave_date?: string | null;
  document_path?: string | null;
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
  training_ref: string | null;
  duration: string | null;
  unpaid_days: number;
  start_date: string | null;
  end_date: string | null;
  original_end_date: string | null;
  extended_end_date: string | null;
  extension_reason: string | null;
  extended_by_label: string | null;
  extended_at: string | null;
  completion_reason: string | null;
  completion_date: string | null;
  completion_requested_by_label: string | null;
  completion_requested_at: string | null;
  manager_approved_by_label: string | null;
  manager_approved_at: string | null;
  hr_approved_by_label: string | null;
  hr_approved_at: string | null;
  remarks?: string | null;
  created_by_label: string | null;
  created_at: string;
  status: string;
  employees?: {
    full_name: string;
    emp_code?: string;
    branch_id?: string | null;
    department_id?: string | null;
    branches?: { name: string } | null;
    departments?: { name: string } | null;
  } | null;
};

export type TrainingExtensionHistoryRow = {
  id: string;
  training_id: string;
  original_end_date: string | null;
  extended_end_date: string;
  extension_reason: string;
  extended_by_label: string | null;
  extended_at: string;
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
  ot_minutes: number;
  ot_pay: number;
  off_shift_minutes?: number;
  late_deduction: number;
  mispunch_deduction: number;
  payable_days: number;
  daily_rate: number;
  gross_earned: number;
  incentive: number;
  bonus: number;
  pf_employee: number;
  esic_employee: number;
  pt_employee?: number;
  net_salary: number;
  /** Persisted by engine when salary_structure_enabled on employee. */
  salary_structure_mode?: boolean;
  salary_package?: number;
  structure_basic?: number;
  structure_hra?: number;
  structure_conveyance?: number;
  structure_bonus?: number;
  structure_other_allowances?: number;
  total_earnings_a?: number;
  employer_pf?: number;
  employer_esic?: number;
  total_employer_cost_b?: number;
  structure_difference?: number;
  tds_employee?: number;
  is_overridden: boolean;
  override_json: Record<string, unknown> | null;
  input_snapshot?: RollupSnapshot | null;
  formula_mode?: "legacy" | "earned" | string;
  attendance_earned?: number | null;
  payroll_days_effective?: number | null;
  earned_breakdown?: Record<string, unknown> | null;
  payable_days_breakdown?: Record<string, unknown> | null;
  calc_snapshot?: Record<string, unknown> | null;
  employees?: EmployeeRow | null;
};

/** fn_rollup_inputs / input_snapshot JSON on payroll_lines. */
export type RollupSnapshot = {
  working?: number;
  week_off?: number;
  present?: number;
  holiday?: number;
  late?: number;
  mispunch?: number;
  leaves?: number;
  paid_leaves?: number;
  comp_off?: number;
  ul?: number;
  sandwich?: number;
  unpaid_training?: number;
  formula_mode?: string;
  attendance_earned?: number;
  payroll_days_effective?: number;
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

export type ApprovalRow = {
  id: string;
  org_id: string;
  entity_type: string;
  entity_id: string;
  stage: string;
  approver_id: string | null;
  decision: string;
  acted_at: string | null;
  comment: string | null;
  created_at?: string | null;
};

export type PayrollPreviewRow = {
  id: string;
  cycle_id: string;
  employee_id: string;
  emp_code: string;
  full_name: string;
  designation: string | null;
  department: string | null;
  company_name: string | null;
  branch_name: string | null;
  cycle_label: string;
  cycle_status: string;
  payable_days: number;
  net_salary: number;
  gross_earned: number;
  late_count: number;
  late_deduction: number;
  is_overridden: boolean;
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
  is_production?: boolean;
  processed_at?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
};

export type SalaryRevisionRow = {
  id: string;
  org_id: string;
  employee_id: string;
  effective_date: string;
  old_salary: number;
  new_salary: number;
  remarks: string | null;
  created_at?: string;
};
