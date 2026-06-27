export type WpmsPolicyKind =
  | "attendance"
  | "leave"
  | "payroll"
  | "salary_template"
  | "bonus"
  | "holiday_calendar";

export const WPMS_POLICY_KINDS: { id: WpmsPolicyKind; label: string }[] = [
  { id: "attendance", label: "Attendance Policy" },
  { id: "leave", label: "Leave Policy" },
  { id: "payroll", label: "Payroll Policy" },
  { id: "salary_template", label: "Salary Template" },
  { id: "bonus", label: "Bonus Policy" },
  { id: "holiday_calendar", label: "Holiday Calendar" },
];

export type WpmsPolicyRow = {
  id: string;
  org_id: string;
  policy_kind: WpmsPolicyKind;
  name: string;
  code: string;
  version: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  config: Record<string, unknown>;
  notes: string | null;
  created_by_label: string | null;
  modified_by_label: string | null;
  created_at: string;
  updated_at: string;
};

export type WpmsBundleRow = {
  id: string;
  org_id: string;
  name: string;
  code: string;
  description: string | null;
  version: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  notes: string | null;
  attendance_policy_id: string | null;
  leave_policy_id: string | null;
  payroll_policy_id: string | null;
  salary_template_id: string | null;
  bonus_policy_id: string | null;
  holiday_calendar_id: string | null;
  created_by_label: string | null;
  modified_by_label: string | null;
  created_at: string;
  updated_at: string;
};

export type WpmsAssignmentRow = {
  id: string;
  org_id: string;
  employee_id: string;
  bundle_id: string;
  effective_from: string;
  effective_to: string | null;
  is_current: boolean;
  assigned_by_label: string | null;
  reason: string | null;
  created_at: string;
  employees?: { emp_code: string; full_name: string } | null;
  wpms_policy_bundles?: { name: string; code: string } | null;
};

export type WpmsAssignmentHistoryRow = {
  id: string;
  employee_id: string;
  previous_bundle_id: string | null;
  new_bundle_id: string;
  effective_date: string;
  changed_by_label: string | null;
  reason: string | null;
  created_at: string;
};

export type HrMasterRow = {
  id: string;
  org_id: string;
  domain: string;
  code: string;
  label: string;
  config: Record<string, unknown>;
  is_active: boolean;
  display_order: number;
  remarks: string | null;
  created_by_label: string | null;
  modified_by_label: string | null;
  created_at: string;
  updated_at: string;
};

/** Default empty config shapes for policy editors */
export const WPMS_DEFAULT_CONFIG: Record<WpmsPolicyKind, Record<string, unknown>> = {
  attendance: {
    working_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    saturday_mandatory: true,
    grace_minutes: 10,
    monthly_late_minutes_cap: 120,
    break_rules: { max_break_min: 60, paid_break: false },
    working_hours: 9,
    missing_punch_rule: "half_day_after_2",
    attendance_exception_rule: "manager_approval",
    photo_evidence_required: false,
    daily_salary_preview: false,
  },
  leave: {
    monthly_cl: 1.0,
    monthly_sl: 0.5,
    carry_forward: true,
    encashment: false,
    holiday_behaviour: "exclude",
    sandwich_leave: true,
    approval_levels: 2,
  },
  payroll: {
    day_calculation: "working_day",
    calendar_day_calculation: false,
    cycle_type: "calendar_month",
    cycle_26_25: false,
    pf_applicable: true,
    esi_applicable: true,
    professional_tax: true,
    tds: true,
    consultant_rules: false,
    salary_lock: true,
    payroll_lock: true,
  },
  salary_template: {
    basic_pct: 40,
    hra_pct: 20,
    special_allowance_pct: 25,
    conveyance: 1600,
    medical: 1250,
    bonus_component: 0,
    other_earnings: [],
    custom_components: [],
  },
  bonus: {
    eligible: true,
    after_months: 12,
    include_probation: false,
    exclude_probation: true,
    manual_override: true,
    approval_required: true,
  },
  holiday_calendar: {
    region: "IN",
    scope: "country",
    branch_id: null,
    custom_dates: [],
  },
};

export const WPMS_POLICY_KIND_LABEL: Record<WpmsPolicyKind, string> = Object.fromEntries(
  WPMS_POLICY_KINDS.map((k) => [k.id, k.label]),
) as Record<WpmsPolicyKind, string>;
