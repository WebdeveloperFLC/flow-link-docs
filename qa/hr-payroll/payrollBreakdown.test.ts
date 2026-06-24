import { describe, expect, it } from "vitest";
import {
  buildPayableDaysBreakdown,
  buildStatutoryBreakdown,
  splitAttendanceDays,
  payableDaysSteps,
} from "../../src/hr-payroll/lib/payrollBreakdown";
import {
  buildBankTransferRows,
  bankTransferCsv,
  bankTransferValidation,
} from "../../src/hr-payroll/lib/bankTransferExport";
import type { AttendanceRow, PayrollLineRow } from "../../src/hr-payroll/lib/types";

const baseLine: PayrollLineRow = {
  id: "l1",
  org_id: "o1",
  cycle_id: "c1",
  employee_id: "e1",
  payroll_days: 30,
  monthly_gross: 42000,
  basic: 21000,
  leaves_taken: 1,
  paid_leaves: 2,
  comp_off: 1,
  late_count: 4,
  mispunch_count: 3,
  ul_count: 0,
  sandwich_count: 0,
  unpaid_training: 0,
  ot_minutes: 0,
  ot_pay: 0,
  late_deduction: 1,
  mispunch_deduction: 0.5,
  payable_days: 30.5,
  daily_rate: 1400,
  gross_earned: 42700,
  incentive: 0,
  bonus: 0,
  pf_employee: 1800,
  esic_employee: 0,
  pt_employee: 200,
  net_salary: 40700,
  is_overridden: false,
  override_json: null,
};

describe("splitAttendanceDays", () => {
  it("splits present, week off, and holiday", () => {
    const att = [
      { status: "Present" },
      { status: "Half Day" },
      { status: "Week Off" },
      { status: "Holiday" },
    ] as AttendanceRow[];
    expect(splitAttendanceDays(att)).toEqual({
      presentDays: 1.5,
      weeklyOffs: 1,
      holidays: 1,
    });
  });
});

describe("buildPayableDaysBreakdown", () => {
  it("uses attendance split when provided", () => {
    const b = buildPayableDaysBreakdown(
      baseLine,
      { payroll_days: 30 },
      { working: 22, week_off: 8 },
      { presentDays: 20, weeklyOffs: 6, holidays: 2 },
    );
    expect(b.presentDays).toBe(20);
    expect(b.weeklyOffs).toBe(6);
    expect(b.holidays).toBe(2);
    expect(b.payableDays).toBe(30.5);
  });

  it("respects override flags", () => {
    const b = buildPayableDaysBreakdown(
      { ...baseLine, is_overridden: true },
      { payroll_days: 30 },
      null,
      null,
    );
    expect(b.isOverridden).toBe(true);
    expect(payableDaysSteps(b).some((s) => s.label === "Payable days")).toBe(true);
  });
});

describe("buildStatutoryBreakdown", () => {
  it("maps India PT and TDS from employee flags", () => {
    const s = buildStatutoryBreakdown(baseLine, {
      ...({} as import("../../src/hr-payroll/lib/types").EmployeeRow),
      tds_applicable: true,
      other_deductions: 500,
      salary_currency: "INR",
    });
    expect(s.ptEmployee).toBe(200);
    expect(s.tdsLine).toBe(500);
    expect(s.otherDeductions).toBe(0);
  });

  it("maps Canada income tax to tdsLine from pt_employee", () => {
    const s = buildStatutoryBreakdown(
      { ...baseLine, pt_employee: 320 },
      {
        ...({} as import("../../src/hr-payroll/lib/types").EmployeeRow),
        payroll_country: "CA",
        salary_currency: "CAD",
        tds_applicable: true,
      },
    );
    expect(s.isCanada).toBe(true);
    expect(s.ptEmployee).toBe(0);
    expect(s.tdsLine).toBe(320);
  });
});

describe("bankTransferExport", () => {
  it("builds CSV with beneficiary fields", () => {
    const rows = buildBankTransferRows([
      {
        ...baseLine,
        net_salary: 40700,
        employees: {
          emp_code: "E001",
          full_name: "Test User",
          bank_holder_name: "Test User",
          bank_name: "HDFC",
          bank_account_number: "1234567890",
          bank_ifsc: "HDFC0001234",
          bank_verified: true,
          salary_currency: "INR",
        } as import("../../src/hr-payroll/lib/types").EmployeeRow,
      },
    ]);
    expect(rows[0].hasBankDetails).toBe(true);
    const csv = bankTransferCsv(rows);
    expect(csv).toContain("E001");
    expect(csv).toContain("HDFC0001234");
    expect(bankTransferValidation(rows).missingBank).toHaveLength(0);
  });
});
