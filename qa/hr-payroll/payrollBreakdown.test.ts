import { describe, expect, it } from "vitest";
import {
  buildEmployerStatutoryBreakdown,
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

describe("buildEmployerStatutoryBreakdown", () => {
  it("India — PF employer matches employee; ESIC employer at 3.25%", () => {
    const e = buildEmployerStatutoryBreakdown(
      { ...baseLine, gross_earned: 40000, pf_employee: 2520, esic_employee: 300 },
      {
        ...({} as import("../../src/hr-payroll/lib/types").EmployeeRow),
        pf_applicable: true,
        esic_applicable: true,
        monthly_gross: 20000,
        salary_currency: "INR",
      },
    );
    expect(e.pfEmployer).toBe(2520);
    expect(e.esicEmployer).toBe(1300);
    expect(e.show).toBe(true);
  });

  it("Canada — CPP employer matches employee; EI employer scaled", () => {
    const e = buildEmployerStatutoryBreakdown(
      { ...baseLine, pf_employee: 268, esic_employee: 75 },
      {
        ...({} as import("../../src/hr-payroll/lib/types").EmployeeRow),
        payroll_country: "CA",
        salary_currency: "CAD",
      },
    );
    expect(e.cppEmployer).toBe(268);
    expect(e.eiEmployer).toBe(Math.round(75 * (2.324 / 1.66)));
    expect(e.show).toBe(true);
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

  it("India requires account number and IFSC", () => {
    const rows = buildBankTransferRows([
      {
        ...baseLine,
        employees: {
          emp_code: "IN01",
          full_name: "India User",
          bank_account_number: "1234567890",
          bank_ifsc: "",
          salary_currency: "INR",
          payroll_country: "IN",
        } as import("../../src/hr-payroll/lib/types").EmployeeRow,
      },
    ]);
    expect(rows[0].hasBankDetails).toBe(false);
    expect(bankTransferValidation(rows).missingBank).toHaveLength(1);
  });

  it("Canada requires account, transit (ifsc), and institution (branch)", () => {
    const complete = buildBankTransferRows([
      {
        ...baseLine,
        employees: {
          emp_code: "CA01",
          full_name: "Canada User",
          bank_account_number: "1234567",
          bank_ifsc: "12345",
          bank_branch: "003",
          bank_verified: true,
          salary_currency: "CAD",
          payroll_country: "CA",
        } as import("../../src/hr-payroll/lib/types").EmployeeRow,
      },
    ]);
    expect(complete[0].hasBankDetails).toBe(true);
    expect(bankTransferValidation(complete).missingBank).toHaveLength(0);

    const missingInstitution = buildBankTransferRows([
      {
        ...baseLine,
        employees: {
          emp_code: "CA02",
          full_name: "Canada Incomplete",
          bank_account_number: "1234567",
          bank_ifsc: "12345",
          bank_branch: "",
          salary_currency: "CAD",
          payroll_country: "CA",
        } as import("../../src/hr-payroll/lib/types").EmployeeRow,
      },
    ]);
    expect(missingInstitution[0].hasBankDetails).toBe(false);
  });
});
