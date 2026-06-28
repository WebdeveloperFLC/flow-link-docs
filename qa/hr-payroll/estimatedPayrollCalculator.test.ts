import { describe, expect, it } from "vitest";
import {
  computeEstimatedDeductions,
  computeEstimatedPayroll,
  computeOvertimePay,
  computeWorkingDays,
  enumerateCycleDates,
  presentDayCredit,
  resolvePayBasis,
  resolveWageRates,
} from "@/hr-payroll/lib/estimatedPayrollCalculator";
import type { AttendanceRow, ShiftRow } from "@/hr-payroll/lib/types";

const shift: ShiftRow = {
  id: "s1",
  org_id: "o1",
  name: "Day",
  type: "Day",
  login_time: "10:00:00",
  logout_time: "19:00:00",
  grace_min: 5,
  break_min: 45,
  half_day_after_min: 240,
  work_hours: 8,
  working_days_per_week: 6,
  timezone: "Asia/Kolkata",
};

const baseEmployee = {
  work_week: "6-Day",
  date_of_joining: "2020-01-01",
  exit_date: null,
  status: "Confirmed",
  pay_basis: "Monthly",
  basic: 15000,
  hra: 6000,
  conveyance: 0,
  bonus_percentage: 8.33,
  other_allowances: 0,
  salary_package: null,
  pf_applicable: true,
  esic_applicable: false,
  pt_applicable: true,
  tds_applicable: false,
  other_deductions: 0,
  payroll_country: "IN",
  salary_currency: "INR",
  employee_pf_pct: 12,
  employee_esic_pct: 0.75,
  professional_tax_amount: 200,
  has_pf_account: true,
};

function att(
  work_date: string,
  status: string,
  check_in: string | null = null,
  check_out: string | null = null,
): AttendanceRow {
  return {
    id: `a-${work_date}`,
    org_id: "o1",
    employee_id: "e1",
    work_date,
    check_in,
    check_out,
    break_start: null,
    break_end: null,
    break_min: 45,
    status,
    is_mispunch: false,
    source: "manual",
    note: null,
  };
}

describe("estimatedPayrollCalculator", () => {
  it("enumerates cycle dates inclusive", () => {
    expect(enumerateCycleDates("2026-05-26", "2026-05-28")).toEqual([
      "2026-05-26",
      "2026-05-27",
      "2026-05-28",
    ]);
  });

  it("computes working days excluding weekly off (Sunday for 6-day week)", () => {
    const days = computeWorkingDays({
      cycleStart: "2026-06-01",
      cycleEnd: "2026-06-07",
      payrollDaysConfigured: 6,
      workWeek: "6-Day",
      employeeStatus: "Confirmed",
      holidayDates: new Set(),
    });
    expect(days).toBe(6);
  });

  it("resolves pay basis from employee salary structure", () => {
    expect(resolvePayBasis("Hourly")).toBe("Hourly");
    expect(resolvePayBasis(null)).toBe("Monthly");
  });

  it("monthly pay basis: present earns daily rate not hours × hourly", () => {
    expect(presentDayCredit("Monthly", 10000, 1250, 4)).toBe(10000);
    const result = computeEstimatedPayroll({
      employee: { ...baseEmployee, monthly_gross: 30000 },
      shift,
      cycle: {
        label: "Jun 2026",
        start_date: "2026-06-02",
        end_date: "2026-06-04",
        payroll_days: 3,
      },
      attendance: [
        att("2026-06-02", "Present", "10:00", "14:00"),
        att("2026-06-03", "Half Day"),
        att("2026-06-04", "Absent"),
      ],
      holidays: [],
    });
    expect(result.payBasis).toBe("Monthly");
    expect(result.dailyRate).toBe(10000);
    expect(result.estimatedEarnings).toBe(10000);
    expect(result.estimatedGross).toBe(15000);
    expect(result.attendanceBreakdown.present).toBe(1);
    expect(result.attendanceBreakdown.halfDay).toBe(1);
    expect(result.attendanceBreakdown.absent).toBe(1);
  });

  it("hourly pay basis: present earns worked hours × hourly rate", () => {
    const rates = resolveWageRates({
      payBasis: "Hourly",
      wageAmount: 500,
      workingDays: 22,
      standardWorkingHours: 8,
    });
    expect(rates.hourlyRate).toBe(500);
    expect(rates.dailyRate).toBe(4000);

    const result = computeEstimatedPayroll({
      employee: { ...baseEmployee, pay_basis: "Hourly", monthly_gross: 500 },
      shift,
      cycle: {
        label: "Jun 2026",
        start_date: "2026-06-02",
        end_date: "2026-06-02",
        payroll_days: 1,
      },
      attendance: [att("2026-06-02", "Present", "10:00", "14:00")],
      holidays: [],
    });
    expect(result.payBasis).toBe("Hourly");
    expect(result.estimatedEarnings).toBeGreaterThan(0);
    expect(result.estimatedEarnings).toBeLessThan(result.dailyRate);
  });

  it("daily pay basis: present earns daily wage amount", () => {
    const result = computeEstimatedPayroll({
      employee: { ...baseEmployee, pay_basis: "Daily", monthly_gross: 1200 },
      shift,
      cycle: {
        label: "Jun 2026",
        start_date: "2026-06-02",
        end_date: "2026-06-03",
        payroll_days: 2,
      },
      attendance: [att("2026-06-02", "Present", "10:00", "19:00")],
      holidays: [],
    });
    expect(result.dailyRate).toBe(1200);
    expect(result.estimatedEarnings).toBe(1200);
  });

  it("credits paid leave and holiday at 100% daily rate", () => {
    const result = computeEstimatedPayroll({
      employee: { ...baseEmployee, monthly_gross: 26000 },
      shift,
      cycle: {
        label: "Jun 2026",
        start_date: "2026-06-02",
        end_date: "2026-06-03",
        payroll_days: 2,
      },
      attendance: [att("2026-06-02", "Leave"), att("2026-06-03", "Holiday")],
      holidays: [],
    });
    expect(result.attendanceBreakdown.paidLeave).toBe(1);
    expect(result.attendanceBreakdown.holiday).toBe(1);
    expect(result.estimatedGross).toBe(26000);
    expect(result.estimatedEarnings).toBe(0);
  });

  it("computes estimated deductions and net without fn_compute_payroll", () => {
    const deductions = computeEstimatedDeductions(30000, {
      ...baseEmployee,
      monthly_gross: 30000,
    });
    expect(deductions.pf).toBeGreaterThan(0);
    expect(deductions.incomeTax).toBeNull();
    expect(deductions.estimatedNet).toBeLessThan(30000);
  });

  it("shows OT hours without money when policy mode is display", () => {
    const { otPay, displayOnly } = computeOvertimePay(60, 1000, { mode: "display" });
    expect(otPay).toBeNull();
    expect(displayOnly).toBe(true);
  });

  it("computes OT pay when policy mode is paid", () => {
    const { otPay, displayOnly } = computeOvertimePay(60, 8000, {
      mode: "paid",
      hours_per_day: 8,
      rate_multiplier: 1.5,
      min_ot_minutes: 30,
    });
    expect(displayOnly).toBe(false);
    expect(otPay).toBe(1500);
  });
});
