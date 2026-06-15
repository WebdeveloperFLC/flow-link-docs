import type { EmployeeRow, LeaveBalanceRow, LeaveRequestRow } from "./types";

/** Paid leave types employees may apply for (Unpaid is auto-selected when rules block paid). */
export const PAID_APPLY_LEAVE_TYPES = ["Casual Leave", "Sick Leave"] as const;
export const UNPAID_LEAVE_TYPE = "Unpaid Leave";
export const MONTHLY_PAID_LEAVE_CAP = 1.5;

export const LEAVE_ENTITLED = { casual: 12, sick: 6 } as const;
export const LEAVE_ACCRUAL = { casual: 1.0, sick: 0.5 } as const;
export const LEAVE_ENTITLED_5DAY = { casual: 7, sick: 3 } as const;

export const ELIGIBLE_EMPLOYMENT_TYPES = ["Full time - Permanent"] as const;
export const NOTICE_DAYS_SHORT = 7;
export const NOTICE_DAYS_LONG = 30;
export const NOTICE_THRESHOLD_DAYS = 3;
export const SICK_NOTICE_HOURS = 2;
export const SICK_CERT_AFTER_DAYS_PER_MONTH = 1;

export const LEAVE_RULES_REJECT_MSG =
  "Leave request will be rejected as leave rules not followed";

export type PaidApplyLeaveType = (typeof PAID_APPLY_LEAVE_TYPES)[number];

export function leaveDurationLabel(days: number): string {
  if (days <= 0.5) return "Half Day";
  if (days === 1) return "Full Day";
  return `${days} days`;
}

export function isLegacyLeaveType(type: string): boolean {
  return !["Casual Leave", "Sick Leave", "Unpaid Leave"].includes(type);
}

export function leaveBalanceRemaining(b: Pick<LeaveBalanceRow, "accrued" | "taken">): number {
  return Math.max(0, Number(b.accrued) - Number(b.taken));
}

export function balanceForType(balances: LeaveBalanceRow[], type: string): LeaveBalanceRow | undefined {
  return balances.find((b) => b.type === type);
}

export function isLeaveEligible(emp: Pick<EmployeeRow, "employment_type" | "status" | "work_hours" | "probation_end_date" | "date_of_joining">): boolean {
  if (!ELIGIBLE_EMPLOYMENT_TYPES.includes(emp.employment_type as (typeof ELIGIBLE_EMPLOYMENT_TYPES)[number])) {
    return false;
  }
  if (Number(emp.work_hours ?? 9) < 8) return false;
  if (emp.status === "On Probation") return false;
  const probEnd = emp.probation_end_date
    ? new Date(emp.probation_end_date)
    : emp.date_of_joining
      ? new Date(new Date(emp.date_of_joining).getTime() + 90 * 86400000)
      : null;
  if (probEnd && new Date() <= probEnd) return false;
  return true;
}

export function validateLeaveNotice(
  days: number,
  fromDate: string,
  appliedAt: Date = new Date(),
): { valid: boolean; reason: string | null } {
  if (!fromDate) return { valid: true, reason: null };
  const from = new Date(fromDate + "T00:00:00");
  const applied = new Date(appliedAt);
  applied.setHours(0, 0, 0, 0);

  if (days <= NOTICE_THRESHOLD_DAYS) {
    const minFrom = new Date(applied);
    minFrom.setDate(minFrom.getDate() + NOTICE_DAYS_SHORT);
    if (from < minFrom) {
      return {
        valid: false,
        reason: `${LEAVE_RULES_REJECT_MSG} (minimum 7 days notice for 1–3 days leave)`,
      };
    }
  } else {
    const minFrom = new Date(applied);
    minFrom.setDate(minFrom.getDate() + NOTICE_DAYS_LONG);
    if (from < minFrom) {
      return {
        valid: false,
        reason: `${LEAVE_RULES_REJECT_MSG} (minimum 1 month notice for 4+ days leave)`,
      };
    }
  }
  return { valid: true, reason: null };
}

export function monthlySickDaysUsed(
  requests: Pick<LeaveRequestRow, "type" | "days" | "from_date" | "status" | "employee_id">[],
  employeeId: string,
  refDate: string,
  excludeRequestId?: string,
): number {
  if (!refDate) return 0;
  const monthPrefix = refDate.slice(0, 7);
  return requests
    .filter(
      (r) =>
        r.employee_id === employeeId &&
        r.id !== excludeRequestId &&
        r.type === "Sick Leave" &&
        (r.status === "Approved" || r.status === "Pending") &&
        r.from_date.startsWith(monthPrefix),
    )
    .reduce((sum, r) => sum + Number(r.days), 0);
}

export function validateSickLeaveRules(input: {
  employeeId: string;
  fromDate: string;
  days: number;
  hasDocument: boolean;
  requests: Pick<LeaveRequestRow, "type" | "days" | "from_date" | "status" | "employee_id" | "id">[];
  shiftLoginTime?: string | null;
  appliedAt?: Date;
}): { valid: boolean; reason: string | null } {
  const { employeeId, fromDate, days, hasDocument, requests, shiftLoginTime, appliedAt = new Date() } = input;

  if (shiftLoginTime && fromDate) {
    const [h, m] = shiftLoginTime.slice(0, 5).split(":").map(Number);
    const shiftStart = new Date(fromDate + "T00:00:00");
    shiftStart.setHours(h, m, 0, 0);
    const noticeDeadline = new Date(shiftStart.getTime() - SICK_NOTICE_HOURS * 3600000);
    if (appliedAt > noticeDeadline) {
      return {
        valid: false,
        reason: `Sick Leave must be informed at least ${SICK_NOTICE_HOURS} hours before shift start`,
      };
    }
  }

  const monthlySick = monthlySickDaysUsed(requests, employeeId, fromDate);
  if (monthlySick + days > SICK_CERT_AFTER_DAYS_PER_MONTH && !hasDocument) {
    return {
      valid: false,
      reason: "Medical certificate required when Sick Leave exceeds 1 day in a month",
    };
  }

  return { valid: true, reason: null };
}

/** Sum Casual + Sick days already taken or pending in the calendar month of refDate (YYYY-MM-DD). */
export function monthlyPaidLeaveUsed(
  requests: Pick<LeaveRequestRow, "type" | "days" | "from_date" | "status" | "employee_id">[],
  employeeId: string,
  refDate: string,
  excludeRequestId?: string,
): number {
  if (!refDate) return 0;
  const monthPrefix = refDate.slice(0, 7);
  return requests
    .filter(
      (r) =>
        r.employee_id === employeeId &&
        r.id !== excludeRequestId &&
        PAID_APPLY_LEAVE_TYPES.includes(r.type as PaidApplyLeaveType) &&
        (r.status === "Approved" || r.status === "Pending") &&
        r.from_date.startsWith(monthPrefix),
    )
    .reduce((sum, r) => sum + Number(r.days), 0);
}

export function monthlyPaidLeaveRemaining(
  requests: Pick<LeaveRequestRow, "type" | "days" | "from_date" | "status" | "employee_id">[],
  employeeId: string,
  refDate: string,
  excludeRequestId?: string,
): number {
  return Math.max(
    0,
    MONTHLY_PAID_LEAVE_CAP - monthlyPaidLeaveUsed(requests, employeeId, refDate, excludeRequestId),
  );
}

export type LeaveApplyResolution = {
  effectiveType: string;
  forcedUnpaid: boolean;
  unpaidReason: string | null;
  ruleViolation: string | null;
  selectablePaidTypes: PaidApplyLeaveType[];
};

/** Decide whether paid leave is allowed or must fall back to Unpaid Leave. */
export function resolveLeaveApplication(input: {
  preferredType: string;
  days: number;
  employeeId: string;
  fromDate: string;
  balances: LeaveBalanceRow[];
  requests: Pick<LeaveRequestRow, "type" | "days" | "from_date" | "status" | "employee_id" | "id">[];
  employee?: Pick<EmployeeRow, "employment_type" | "status" | "work_hours" | "probation_end_date" | "date_of_joining"> | null;
  hasDocument?: boolean;
  shiftLoginTime?: string | null;
  excludeRequestId?: string;
}): LeaveApplyResolution {
  const {
    preferredType,
    days,
    employeeId,
    fromDate,
    balances,
    requests,
    employee,
    hasDocument = false,
    shiftLoginTime,
    excludeRequestId,
  } = input;

  const monthUsed = monthlyPaidLeaveUsed(requests, employeeId, fromDate, excludeRequestId);
  const monthRemaining = MONTHLY_PAID_LEAVE_CAP - monthUsed;

  const selectablePaidTypes = PAID_APPLY_LEAVE_TYPES.filter((t) => {
    const bal = balanceForType(balances, t);
    const remaining = bal ? leaveBalanceRemaining(bal) : 0;
    if (remaining < days || monthUsed + days > MONTHLY_PAID_LEAVE_CAP) return false;
    if (employee && !isLeaveEligible(employee)) return false;
    const notice = validateLeaveNotice(days, fromDate);
    if (!notice.valid) return false;
    if (t === "Sick Leave") {
      const sick = validateSickLeaveRules({
        employeeId,
        fromDate,
        days,
        hasDocument,
        requests,
        shiftLoginTime,
      });
      if (!sick.valid) return false;
    }
    return true;
  });

  if (preferredType === UNPAID_LEAVE_TYPE) {
    return {
      effectiveType: UNPAID_LEAVE_TYPE,
      forcedUnpaid: false,
      unpaidReason: null,
      ruleViolation: null,
      selectablePaidTypes,
    };
  }

  if (employee && !isLeaveEligible(employee)) {
    return {
      effectiveType: UNPAID_LEAVE_TYPE,
      forcedUnpaid: true,
      unpaidReason: "Not eligible for paid leave (Full time Permanent after probation only).",
      ruleViolation: `${LEAVE_RULES_REJECT_MSG} (employment type or probation)`,
      selectablePaidTypes,
    };
  }

  const notice = validateLeaveNotice(days, fromDate);
  if (!notice.valid) {
    return {
      effectiveType: UNPAID_LEAVE_TYPE,
      forcedUnpaid: true,
      unpaidReason: notice.reason,
      ruleViolation: notice.reason,
      selectablePaidTypes,
    };
  }

  const preferredPaid = PAID_APPLY_LEAVE_TYPES.includes(preferredType as PaidApplyLeaveType);
  if (!preferredPaid) {
    return {
      effectiveType: UNPAID_LEAVE_TYPE,
      forcedUnpaid: true,
      unpaidReason: "Only Casual Leave or Sick Leave can be paid.",
      ruleViolation: null,
      selectablePaidTypes,
    };
  }

  if (preferredType === "Sick Leave") {
    const sick = validateSickLeaveRules({
      employeeId,
      fromDate,
      days,
      hasDocument,
      requests,
      shiftLoginTime,
    });
    if (!sick.valid) {
      return {
        effectiveType: UNPAID_LEAVE_TYPE,
        forcedUnpaid: true,
        unpaidReason: sick.reason,
        ruleViolation: sick.reason,
        selectablePaidTypes,
      };
    }
  }

  const bal = balanceForType(balances, preferredType);
  const balanceRemaining = bal ? leaveBalanceRemaining(bal) : 0;

  if (monthUsed + days > MONTHLY_PAID_LEAVE_CAP) {
    return {
      effectiveType: UNPAID_LEAVE_TYPE,
      forcedUnpaid: true,
      unpaidReason: `Monthly paid leave cap (${MONTHLY_PAID_LEAVE_CAP} days) reached — ${monthRemaining.toFixed(1)} day(s) left this month.`,
      ruleViolation: `${LEAVE_RULES_REJECT_MSG} (monthly cap)`,
      selectablePaidTypes,
    };
  }

  if (balanceRemaining < days) {
    return {
      effectiveType: UNPAID_LEAVE_TYPE,
      forcedUnpaid: true,
      unpaidReason: `Insufficient ${preferredType} balance (${balanceRemaining.toFixed(1)} remaining).`,
      ruleViolation: null,
      selectablePaidTypes,
    };
  }

  return {
    effectiveType: preferredType,
    forcedUnpaid: false,
    unpaidReason: null,
    ruleViolation: null,
    selectablePaidTypes,
  };
}

/** Balances shown to employees — Casual and Sick only. */
export function displayLeaveBalances(
  balances: LeaveBalanceRow[],
  workWeek?: string,
): LeaveBalanceRow[] {
  const is5Day = workWeek === "5-Day";
  const entitled = is5Day ? LEAVE_ENTITLED_5DAY : LEAVE_ENTITLED;
  return PAID_APPLY_LEAVE_TYPES.map((type) => {
    const row = balanceForType(balances, type);
    const ent = type === "Sick Leave" ? entitled.sick : entitled.casual;
    return (
      row ?? {
        id: type,
        org_id: "",
        employee_id: "",
        policy_year: new Date().getFullYear(),
        type,
        entitled: ent,
        accrued: 0,
        taken: 0,
      }
    );
  });
}

/** Default late deduction slab table (editable via Config). */
export const DEFAULT_LATE_SLAB_TABLE = [
  { max: 3, deduction: 1.0 },
  { max: 6, deduction: 1.5 },
  { max: 9, deduction: 2.0 },
  { max: 12, deduction: 2.5 },
  { max: 15, deduction: 3.0 },
  { max: 18, deduction: 3.5 },
  { max: 21, deduction: 4.0 },
  { max: 24, deduction: 4.5 },
  { max: 27, deduction: 5.0 },
  { max: 999, deduction: 5.5 },
] as const;

export function lateDeductionFromSlab(lateCount: number, slabTable = DEFAULT_LATE_SLAB_TABLE): number {
  for (const row of slabTable) {
    if (lateCount <= row.max) return row.deduction;
  }
  return slabTable[slabTable.length - 1]?.deduction ?? 5.5;
}
