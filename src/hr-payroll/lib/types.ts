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
  name: string;
  login_time: string;
  logout_time: string;
};

export type PayrollCycleRow = {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  payroll_days: number;
  status: string;
};
