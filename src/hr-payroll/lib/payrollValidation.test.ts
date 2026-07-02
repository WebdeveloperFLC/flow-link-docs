import { describe, it, expect } from "vitest";
import {
  validatePayrollLine,
  validatePayrollLines,
  summarizePayrollValidation,
} from "./payrollValidation";
import type { PayrollLineRow } from "./types";

/** Minimal valid payroll line; override fields per-test. */
function line(overrides: Partial<PayrollLineRow> = {}): PayrollLineRow {
  return {
    id: "l1",
    org_id: "o1",
    cycle_id: "c1",
    employee_id: "e1",
    payroll_days: 30,
    monthly_gross: 30000,
    basic: 15000,
    leaves_taken: 0,
    paid_leaves: 0,
    comp_off: 0,
    late_count: 0,
    mispunch_count: 0,
    ul_count: 0,
    sandwich_count: 0,
    unpaid_training: 0,
    ot_minutes: 0,
    ot_pay: 0,
    late_deduction: 0,
    mispunch_deduction: 0,
    payable_days: 30,
    daily_rate: 1000,
    gross_earned: 30000,
    incentive: 0,
    bonus: 0,
    pf_employee: 1800,
    esic_employee: 0,
    pt_employee: 200,
    net_salary: 28000,
    is_overridden: false,
    override_json: null,
    employees: { id: "e1", emp_code: "E001", full_name: "Asha Rao" } as PayrollLineRow["employees"],
    ...overrides,
  } as PayrollLineRow;
}

describe("validatePayrollLine", () => {
  it("passes a clean line", () => {
    expect(validatePayrollLine(line())).toHaveLength(0);
  });

  it("flags negative payable days as error", () => {
    const issues = validatePayrollLine(line({ payable_days: -1 }));
    expect(issues.some((i) => i.field === "payable_days" && i.severity === "error")).toBe(true);
  });

  it("flags negative net salary as error", () => {
    const issues = validatePayrollLine(line({ net_salary: -5 }));
    expect(issues.some((i) => i.field === "net_salary" && i.severity === "error")).toBe(true);
  });

  it("flags NaN gross as error", () => {
    const issues = validatePayrollLine(line({ gross_earned: NaN }));
    expect(issues.some((i) => i.field === "gross_earned" && i.severity === "error")).toBe(true);
  });

  it("flags net exceeding earnings as error", () => {
    // gross 30000 + inc 0 + bonus 0 = 30000; net 31000 > earnings
    const issues = validatePayrollLine(line({ net_salary: 31000 }));
    expect(issues.some((i) => i.message.includes("exceeds") && i.severity === "error")).toBe(true);
  });

  it("allows net within earnings including incentive + bonus", () => {
    const issues = validatePayrollLine(
      line({ gross_earned: 30000, incentive: 5000, bonus: 1000, net_salary: 34000 }),
    );
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("warns (not errors) on zero net when there were gross earnings", () => {
    const issues = validatePayrollLine(line({ net_salary: 0, gross_earned: 30000 }));
    expect(issues.every((i) => i.severity === "warning")).toBe(true);
    expect(issues.some((i) => i.field === "net_salary" && i.severity === "warning")).toBe(true);
  });

  it("warns once (zero gross) on a zero-earnings line, not twice", () => {
    const issues = validatePayrollLine(line({ net_salary: 0, gross_earned: 0 }));
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe("gross_earned");
    expect(issues[0].severity).toBe("warning");
  });

  it("does not warn on a legitimate zero-day line", () => {
    const issues = validatePayrollLine(
      line({ payable_days: 0, gross_earned: 0, net_salary: 0 }),
    );
    expect(issues).toHaveLength(0);
  });

  it("tolerates 1-paisa rounding (no false 'net exceeds')", () => {
    const issues = validatePayrollLine(line({ gross_earned: 30000, net_salary: 30000.005 }));
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });
});

describe("validatePayrollLines", () => {
  it("rolls up counts and distinct errored employees", () => {
    const res = validatePayrollLines([
      line({ id: "a", employee_id: "e1" }), // ok
      line({ id: "b", employee_id: "e2", net_salary: -1 }), // error
      line({ id: "c", employee_id: "e2", payable_days: -1 }), // error, same employee
      line({ id: "d", employee_id: "e3", net_salary: 0, gross_earned: 0 }), // warning
    ]);
    expect(res.hasErrors).toBe(true);
    expect(res.errorCount).toBe(2);
    expect(res.warningCount).toBe(1);
    expect(res.employeesWithErrors).toBe(1);
    expect(res.okCount).toBe(1);
    expect(res.totalLines).toBe(4);
  });

  it("empty input is clean", () => {
    const res = validatePayrollLines([]);
    expect(res.hasErrors).toBe(false);
    expect(res.okCount).toBe(0);
    expect(res.totalLines).toBe(0);
  });
});

describe("summarizePayrollValidation", () => {
  it("formats OK-only", () => {
    expect(summarizePayrollValidation(validatePayrollLines([line(), line()]))).toBe("2 OK");
  });
  it("formats mixed with singular/plural", () => {
    const res = validatePayrollLines([line(), line({ net_salary: -1 })]);
    expect(summarizePayrollValidation(res)).toBe("1 OK · 1 error");
  });
});
