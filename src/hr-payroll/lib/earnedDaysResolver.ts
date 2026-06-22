/**
 * Phase C earned-days priority matrix — TS mirror for CI.
 * Canonical spec: docs/HR_PAYROLL_PHASE_C_LOCKED_SPEC.md
 */

export const PHASE_C_DAILY_CREDIT_CAP = 2.0;

export type DayMatrixInput = {
  eligible: boolean;
  status:
    | "Present"
    | "Half Day"
    | "Absent"
    | "Leave"
    | "Sick Leave"
    | "Holiday"
    | "Week Off"
    | "Unauthorized Leave";
  isWeeklyOff: boolean;
  halfLeaveApproved: boolean;
  compOffApproved: boolean;
  isMispunch: boolean;
  isLate: boolean;
  paidLeaveCredit?: number;
};

export type DayMatrixResult = {
  baseCredit: number;
  compOffBonus: number;
  dayCredit: number;
  lateEligible: boolean;
  mispunchEligible: boolean;
  ulDay: boolean;
};

/** Implements spec §5 — do not reorder without updating the locked spec doc. */
export function applyPriorityMatrixC17(input: DayMatrixInput): DayMatrixResult {
  if (!input.eligible) {
    return {
      baseCredit: 0,
      compOffBonus: 0,
      dayCredit: 0,
      lateEligible: false,
      mispunchEligible: false,
      ulDay: false,
    };
  }

  let base = 0;
  const { status, isWeeklyOff, halfLeaveApproved, compOffApproved, isMispunch, isLate } =
    input;

  if (status === "Holiday") {
    base = 1.0;
  } else if (halfLeaveApproved && status === "Half Day") {
    base = 1.0;
  } else if (status === "Week Off") {
    base = 1.0;
  } else if (status === "Present") {
    base = 1.0;
  } else if (status === "Half Day") {
    base = 0.5;
  } else if (status === "Leave" || status === "Sick Leave") {
    base = 1.0;
  } else if (input.paidLeaveCredit != null && input.paidLeaveCredit > 0) {
    base = input.paidLeaveCredit;
  } else {
    base = 0;
  }

  const workedWoHol =
    (status === "Present" || status === "Half Day") &&
    (status === "Holiday" || status === "Week Off" || isWeeklyOff);

  let compOffBonus = 0;
  if (workedWoHol && compOffApproved) {
    compOffBonus = Math.min(1.0, PHASE_C_DAILY_CREDIT_CAP - base);
  }

  const dayCredit = Math.min(base + compOffBonus, PHASE_C_DAILY_CREDIT_CAP);

  const lateEligible =
    isLate &&
    status !== "Half Day" &&
    !["Week Off", "Holiday", "Leave", "Sick Leave", "Unauthorized Leave", "Absent"].includes(
      status,
    );

  return {
    baseCredit: base,
    compOffBonus,
    dayCredit: Math.round(dayCredit * 100) / 100,
    lateEligible,
    mispunchEligible: isMispunch,
    ulDay: status === "Unauthorized Leave",
  };
}

export function payrollDaysEffective(
  cycleStart: string,
  cycleEnd: string,
  cyclePayrollDays: number,
  dateOfJoining: string | null,
  exitDate: string | null,
): number {
  const eligibleFrom = dateOfJoining && dateOfJoining > cycleStart ? dateOfJoining : cycleStart;
  const eligibleTo = exitDate && exitDate < cycleEnd ? exitDate : cycleEnd;
  if (eligibleTo < eligibleFrom) return 0;
  if (eligibleFrom === cycleStart && eligibleTo === cycleEnd) return cyclePayrollDays;
  const from = new Date(`${eligibleFrom}T00:00:00`);
  const to = new Date(`${eligibleTo}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
}

export type EarnedPayrollInput = {
  payrollDays: number;
  payrollDaysEffective: number;
  monthly: number;
  attendanceEarned: number;
  late?: number;
  ul?: number;
  sandwich?: number;
  mispunch?: number;
  unpaidTraining?: number;
  ulMult?: number;
  freeMispunch?: number;
};

export function computeEarnedPayable(input: EarnedPayrollInput): {
  payableDays: number;
  dailyRate: number;
  grossEarned: number;
} {
  const lateDed = lateDeductionFromEarned(input.late ?? 0);
  const misDed = mispunchDeductionEarned(input.mispunch ?? 0, input.freeMispunch ?? 2);
  const ulMult = input.ulMult ?? 2;
  const payable =
    input.attendanceEarned -
    lateDed -
    (input.ul ?? 0) * ulMult -
    (input.sandwich ?? 0) -
    misDed -
    (input.unpaidTraining ?? 0);
  const divisor = input.payrollDaysEffective || input.payrollDays;
  const dailyRate = Math.round((input.monthly / divisor) * 100) / 100;
  const grossEarned = Math.round(dailyRate * payable);
  return {
    payableDays: Math.round(payable * 100) / 100,
    dailyRate,
    grossEarned,
  };
}

function lateDeductionFromEarned(late: number): number {
  if (late <= 0) return 0;
  return 1.0 + Math.floor((late - 1) / 3) * 0.5;
}

function mispunchDeductionEarned(mispunch: number, freePerMonth: number): number {
  if (mispunch <= freePerMonth) return 0;
  return (mispunch - freePerMonth) * 0.5;
}
