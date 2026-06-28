/**
 * Estimated payroll validation layer — NOT fn_compute_payroll.
 * WTM supplies hours/status/leave/OT; payroll module applies money formulas only.
 */

import { dayMetrics, type ShiftMetrics } from "./attendanceMetrics";
import { shiftMetricsFromShift } from "./emp360Rollups";
import { filterHolidaysForEmployee } from "./holidayFilters";
import {
  buildMonthlySalaryStructure,
  DEFAULT_PT_AMOUNT,
  employeeToStructureInput,
} from "./salaryStructure";
import { splitShiftHours } from "./shiftHours";
import type { AttendanceRow, EmployeeRow, HolidayRow, PayrollCycleRow, ShiftRow } from "./types";
import {
  employeeEligibleForAttendance,
  isWeeklyOffDay,
  workWeekFromShiftDays,
} from "./weeklyOff";

export type PayBasis = "Monthly" | "Daily" | "Hourly";

export type OvertimePolicyConfig = {
  mode?: string;
  rate_multiplier?: number | string;
  hours_per_day?: number | string;
  min_ot_minutes?: number | string;
};

export type AttendanceStatusBreakdown = {
  present: number;
  halfDay: number;
  holiday: number;
  paidLeave: number;
  unpaidLeave: number;
  absent: number;
};

export type EstimatedDeductions = {
  pf: number;
  esic: number;
  professionalTax: number;
  /** Placeholder — final TDS computed at payroll lock. */
  incomeTax: number | null;
  total: number;
  estimatedNet: number;
  isCanada: boolean;
};

export type EstimatedPayrollInput = {
  employee: Pick<
    EmployeeRow,
    | "monthly_gross"
    | "work_week"
    | "date_of_joining"
    | "exit_date"
    | "status"
    | "pay_basis"
    | "basic"
    | "hra"
    | "conveyance"
    | "bonus_percentage"
    | "other_allowances"
    | "salary_package"
    | "pf_applicable"
    | "esic_applicable"
    | "pt_applicable"
    | "tds_applicable"
    | "other_deductions"
    | "payroll_country"
    | "salary_currency"
    | "employee_pf_pct"
    | "employee_esic_pct"
    | "professional_tax_amount"
    | "has_pf_account"
  > & {
    shifts?: Pick<ShiftRow, "working_days_per_week" | "work_hours"> | null;
  };
  shift: ShiftRow;
  cycle: Pick<PayrollCycleRow, "start_date" | "end_date" | "payroll_days" | "label">;
  attendance: AttendanceRow[];
  holidays: HolidayRow[];
  branchesById?: Record<string, { country?: string | null }>;
  otPolicy?: OvertimePolicyConfig | null;
};

export type EstimatedPayrollResult = {
  cycleLabel: string;
  cycleStart: string;
  cycleEnd: string;
  payBasis: PayBasis;
  monthlyGross: number;
  workingDays: number;
  dailyRate: number;
  hourlyRate: number;
  standardWorkingHours: number;
  workedDays: number;
  workedHours: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  attendanceBreakdown: AttendanceStatusBreakdown;
  otMinutes: number;
  otPay: number | null;
  otDisplayOnly: boolean;
  estimatedEarnings: number;
  estimatedGross: number;
  deductions: EstimatedDeductions;
};

const PAID_LEAVE_STATUSES = new Set(["Leave", "Sick Leave"]);
const UNPAID_LEAVE_STATUSES = new Set(["Unauthorized Leave"]);
const WORKED_STATUSES = new Set(["Present", "Late"]);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function resolvePayBasis(raw: string | null | undefined): PayBasis {
  const v = (raw ?? "Monthly").trim();
  if (v === "Daily" || v === "Hourly") return v;
  return "Monthly";
}

/** Wage amount field (monthly_gross) interpreted by pay basis. */
export function resolveWageRates(input: {
  payBasis: PayBasis;
  wageAmount: number;
  workingDays: number;
  standardWorkingHours: number;
}): { dailyRate: number; hourlyRate: number } {
  const hrs = input.standardWorkingHours || 8;
  const amount = input.wageAmount ?? 0;

  if (input.payBasis === "Hourly") {
    const hourlyRate = round2(amount);
    return { hourlyRate, dailyRate: round2(hourlyRate * hrs) };
  }

  if (input.payBasis === "Daily") {
    const dailyRate = round2(amount);
    return { dailyRate, hourlyRate: round2(dailyRate / hrs) };
  }

  const dailyRate = round2(amount / (input.workingDays || 1));
  return { dailyRate, hourlyRate: round2(dailyRate / hrs) };
}

/** Present-day credit by pay basis (SSOT from salary structure). */
export function presentDayCredit(
  payBasis: PayBasis,
  dailyRate: number,
  hourlyRate: number,
  workedHours: number,
): number {
  if (payBasis === "Hourly") {
    return round2(workedHours * hourlyRate);
  }
  return dailyRate;
}

export function enumerateCycleDates(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function computeWorkingDays(input: {
  cycleStart: string;
  cycleEnd: string;
  payrollDaysConfigured: number;
  workWeek: string;
  workingDaysPerWeek?: number | null;
  dateOfJoining?: string | null;
  exitDate?: string | null;
  employeeStatus: string;
  holidayDates: Set<string>;
}): number {
  const workWeek =
    input.workWeek ||
    workWeekFromShiftDays(input.workingDaysPerWeek ?? 6);

  let count = 0;
  for (const d of enumerateCycleDates(input.cycleStart, input.cycleEnd)) {
    if (
      !employeeEligibleForAttendance({
        status: input.employeeStatus,
        dateOfJoining: input.dateOfJoining,
        exitDate: input.exitDate,
        workDate: d,
      })
    ) {
      continue;
    }
    if (isWeeklyOffDay(d, workWeek)) continue;
    if (input.holidayDates.has(d)) continue;
    count++;
  }

  return count > 0 ? count : input.payrollDaysConfigured;
}

export function holidayDatesForEmployee(
  holidays: HolidayRow[],
  emp: EmployeeRow,
  branchesById: Record<string, { country?: string | null }> = {},
  cycleStart: string,
  cycleEnd: string,
): Set<string> {
  const applicable = filterHolidaysForEmployee(holidays, emp, branchesById);
  const dates = new Set<string>();
  for (const h of applicable) {
    if (h.holiday_date >= cycleStart && h.holiday_date <= cycleEnd) {
      dates.add(h.holiday_date);
    }
  }
  return dates;
}

function workedMinutesForRow(
  row: AttendanceRow,
  shiftMetrics: ShiftMetrics,
  splitWindow: { login: string; logout: string; breakDur: number },
): number {
  if (row.shift_work_min != null && row.shift_work_min > 0) {
    return row.shift_work_min;
  }
  const dm = dayMetrics(row, shiftMetrics);
  if (dm.shiftWorkMin > 0) return dm.shiftWorkMin;
  if (dm.net != null && dm.net > 0) return dm.net;
  if (row.check_in && row.check_out) {
    return splitShiftHours(row.check_in, row.check_out, row.break_min, splitWindow).shiftWorkMin;
  }
  return 0;
}

function otMinutesForRow(
  row: AttendanceRow,
  splitWindow: { login: string; logout: string; breakDur: number },
): number {
  if (!row.check_in || !row.check_out) return 0;
  return splitShiftHours(row.check_in, row.check_out, row.break_min, splitWindow).otMin;
}

export function computeOvertimePay(
  otMinutes: number,
  dailyRate: number,
  otPolicy?: OvertimePolicyConfig | null,
  standardWorkingHours = 8,
): { otPay: number | null; displayOnly: boolean } {
  const mode = String(otPolicy?.mode ?? "display");
  const minOt = Number(otPolicy?.min_ot_minutes ?? 30);
  const hoursPerDay = Number(otPolicy?.hours_per_day ?? standardWorkingHours);
  const multiplier = Number(otPolicy?.rate_multiplier ?? 1.5);

  if (mode !== "paid" || otMinutes < minOt) {
    return { otPay: null, displayOnly: true };
  }

  const hourly = dailyRate / (hoursPerDay || 8);
  const otPay = round2((otMinutes / 60) * hourly * multiplier);
  return { otPay, displayOnly: false };
}

/** Estimated statutory deductions — display-only; does not call fn_compute_payroll. */
export function computeEstimatedDeductions(
  estimatedGross: number,
  employee: EstimatedPayrollInput["employee"],
  ptDefault = DEFAULT_PT_AMOUNT,
): EstimatedDeductions {
  const isCanada =
    employee.payroll_country === "CA" || employee.salary_currency === "CAD";

  if (isCanada || estimatedGross <= 0) {
    return {
      pf: 0,
      esic: 0,
      professionalTax: 0,
      incomeTax: null,
      total: 0,
      estimatedNet: round2(estimatedGross),
      isCanada,
    };
  }

  const monthly = employee.monthly_gross || 1;
  const ratio = Math.min(1, estimatedGross / monthly);
  const structure = buildMonthlySalaryStructure(
    employeeToStructureInput(employee as EmployeeRow, ptDefault),
    ptDefault,
  );

  const pf =
    employee.pf_applicable && employee.has_pf_account !== false
      ? round2(structure.employeePf * ratio)
      : 0;
  const esic = employee.esic_applicable ? round2(structure.employeeEsic * ratio) : 0;
  const professionalTax = employee.pt_applicable
    ? round2((employee.professional_tax_amount ?? structure.professionalTax) * ratio)
    : 0;
  const incomeTax = null;

  const total = round2(pf + esic + professionalTax);
  return {
    pf,
    esic,
    professionalTax,
    incomeTax,
    total,
    estimatedNet: round2(Math.max(0, estimatedGross - total)),
    isCanada: false,
  };
}

export function emptyAttendanceBreakdown(): AttendanceStatusBreakdown {
  return {
    present: 0,
    halfDay: 0,
    holiday: 0,
    paidLeave: 0,
    unpaidLeave: 0,
    absent: 0,
  };
}

export function computeEstimatedPayroll(input: EstimatedPayrollInput): EstimatedPayrollResult {
  const { employee, shift, cycle, attendance, holidays, branchesById = {}, otPolicy } = input;
  const payBasis = resolvePayBasis(employee.pay_basis);
  const monthlyGross = employee.monthly_gross ?? 0;
  const standardWorkingHours = shift.work_hours ?? 8;

  const holDates = holidayDatesForEmployee(
    holidays,
    employee as EmployeeRow,
    branchesById,
    cycle.start_date,
    cycle.end_date,
  );

  const workingDays = computeWorkingDays({
    cycleStart: cycle.start_date,
    cycleEnd: cycle.end_date,
    payrollDaysConfigured: cycle.payroll_days,
    workWeek: employee.work_week,
    workingDaysPerWeek: employee.shifts?.working_days_per_week ?? shift.working_days_per_week,
    dateOfJoining: employee.date_of_joining,
    exitDate: employee.exit_date,
    employeeStatus: employee.status,
    holidayDates: holDates,
  });

  const { dailyRate, hourlyRate } = resolveWageRates({
    payBasis,
    wageAmount: monthlyGross,
    workingDays,
    standardWorkingHours,
  });

  const shiftMetrics = shiftMetricsFromShift(shift);
  const splitWindow = {
    login: shift.login_time.slice(0, 5),
    logout: shift.logout_time.slice(0, 5),
    breakDur: shift.break_min ?? 45,
  };

  let workedDays = 0;
  let workedHours = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let otMinutes = 0;
  let estimatedEarnings = 0;
  let dayCredits = 0;
  const attendanceBreakdown = emptyAttendanceBreakdown();

  for (const row of attendance) {
    const status = row.status;
    otMinutes += otMinutesForRow(row, splitWindow);

    if (status === "Half Day") {
      workedDays += 0.5;
      attendanceBreakdown.halfDay += 1;
      dayCredits += dailyRate * 0.5;
      const mins = workedMinutesForRow(row, shiftMetrics, splitWindow);
      if (mins > 0) workedHours += mins / 60;
      continue;
    }

    if (status === "Holiday") {
      attendanceBreakdown.holiday += 1;
      dayCredits += dailyRate;
      continue;
    }

    if (PAID_LEAVE_STATUSES.has(status)) {
      paidLeaveDays += 1;
      attendanceBreakdown.paidLeave += 1;
      dayCredits += dailyRate;
      continue;
    }

    if (UNPAID_LEAVE_STATUSES.has(status)) {
      unpaidLeaveDays += 1;
      attendanceBreakdown.unpaidLeave += 1;
      continue;
    }

    if (status === "Absent") {
      unpaidLeaveDays += 1;
      attendanceBreakdown.absent += 1;
      continue;
    }

    if (status === "Week Off") continue;

    if (WORKED_STATUSES.has(status)) {
      workedDays += 1;
      attendanceBreakdown.present += 1;
      const mins = workedMinutesForRow(row, shiftMetrics, splitWindow);
      const hours =
        payBasis === "Hourly"
          ? mins > 0
            ? mins / 60
            : 0
          : mins > 0
            ? mins / 60
            : standardWorkingHours;
      workedHours += hours;
      estimatedEarnings += presentDayCredit(payBasis, dailyRate, hourlyRate, hours);
    }
  }

  workedHours = round2(workedHours);
  workedDays = round2(workedDays);
  paidLeaveDays = round2(paidLeaveDays);
  unpaidLeaveDays = round2(unpaidLeaveDays);
  estimatedEarnings = round2(estimatedEarnings);
  attendanceBreakdown.present = round2(attendanceBreakdown.present);

  const { otPay, displayOnly } = computeOvertimePay(
    otMinutes,
    dailyRate,
    otPolicy,
    standardWorkingHours,
  );
  const estimatedGross = round2(dayCredits + estimatedEarnings + (otPay ?? 0));
  const deductions = computeEstimatedDeductions(estimatedGross, employee);

  return {
    cycleLabel: cycle.label,
    cycleStart: cycle.start_date,
    cycleEnd: cycle.end_date,
    payBasis,
    monthlyGross,
    workingDays,
    dailyRate,
    hourlyRate,
    standardWorkingHours,
    workedDays,
    workedHours,
    paidLeaveDays,
    unpaidLeaveDays,
    attendanceBreakdown,
    otMinutes,
    otPay,
    otDisplayOnly: displayOnly,
    estimatedEarnings,
    estimatedGross,
    deductions,
  };
}
