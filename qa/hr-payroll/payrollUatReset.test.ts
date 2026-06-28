import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  canResetPayrollCycleUat,
  canUserResetPayrollCycleUat,
  isPayrollCycleUatResetEligible,
} from "@/hr-payroll/lib/payrollUatReset";

const ROOT = join(process.cwd());
const MIGRATION = join(ROOT, "supabase/migrations/20260738120000_hr_payroll_cycle_uat_reset.sql");

describe("Payroll cycle UAT reset", () => {
  it("migration defines UAT reset RPC without touching fn_compute_payroll", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("fn_reset_payroll_cycle_uat");
    expect(sql).toContain("is_production");
    expect(sql).toContain("DELETE FROM payroll_lines WHERE cycle_id = p_cycle");
    expect(sql).toContain("DELETE FROM salary_slips WHERE cycle_id = p_cycle");
    expect(sql).toContain("DELETE FROM payroll_line_snapshots WHERE cycle_id = p_cycle");
    expect(sql).toContain("DELETE FROM payroll_cycle_snapshots WHERE cycle_id = p_cycle");
    expect(sql).toContain("DELETE FROM accounting_payouts WHERE cycle_id = p_cycle");
    expect(sql).toContain("Payroll cycle reset for UAT by");
    expect(sql).not.toMatch(/CREATE OR REPLACE FUNCTION fn_compute_payroll/i);
    expect(sql).not.toContain("DELETE FROM attendance");
    expect(sql).not.toContain("DELETE FROM employees");
    expect(sql).not.toContain("DELETE FROM audit_log");
    expect(sql).not.toContain("wtm_attendance_snapshots");
  });

  it("migration restricts reset to HR Admin / Payroll Admin", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("fn_can_reset_payroll_cycle_uat");
    expect(sql).toContain("'Admin'::hr_role, 'Super Admin'::hr_role");
    expect(sql).toContain("'HR Manager'::hr_role");
    expect(sql).toContain("has_perm(p_org, 'configure')");
    expect(sql).toContain("has_perm(p_org, 'approve')");
  });

  it("blocks production and non-workflow statuses", () => {
    expect(isPayrollCycleUatResetEligible({ status: "Draft", is_production: false })).toBe(false);
    expect(isPayrollCycleUatResetEligible({ status: "Processed", is_production: true })).toBe(false);
    expect(isPayrollCycleUatResetEligible({ status: "Locked", is_production: false })).toBe(true);
    expect(isPayrollCycleUatResetEligible({ status: "Paid", is_production: false })).toBe(true);
  });

  it("allows HR Admin (configure) and Payroll Admin (HR Manager + approve)", () => {
    expect(
      canUserResetPayrollCycleUat({ role: "Admin", canConfigure: true, canApprove: true }),
    ).toBe(true);
    expect(
      canUserResetPayrollCycleUat({ role: "Super Admin", canConfigure: true, canApprove: false }),
    ).toBe(true);
    expect(
      canUserResetPayrollCycleUat({ role: "HR Manager", canConfigure: false, canApprove: true }),
    ).toBe(true);
    expect(
      canUserResetPayrollCycleUat({ role: "HR Executive", canConfigure: false, canApprove: true }),
    ).toBe(false);
    expect(
      canUserResetPayrollCycleUat({ role: "HR Manager", canConfigure: false, canApprove: false }),
    ).toBe(false);
  });

  it("combines cycle eligibility, selection, and role gates", () => {
    expect(
      canResetPayrollCycleUat({
        cycle: { status: "Approved", is_production: false },
        hasSelectedCycle: true,
        role: "Admin",
        canConfigure: true,
        canApprove: true,
      }),
    ).toBe(true);
    expect(
      canResetPayrollCycleUat({
        cycle: { status: "Approved", is_production: true },
        hasSelectedCycle: true,
        role: "Admin",
        canConfigure: true,
        canApprove: true,
      }),
    ).toBe(false);
    expect(
      canResetPayrollCycleUat({
        cycle: { status: "Approved", is_production: false },
        hasSelectedCycle: false,
        role: "Admin",
        canConfigure: true,
        canApprove: true,
      }),
    ).toBe(false);
  });

  it("verify page exposes UAT reset action and confirmation copy", () => {
    const page = readFileSync(join(ROOT, "src/hr-payroll/pages/HrVerifyPage.tsx"), "utf8");
    expect(page).toContain("Reset Payroll Cycle (UAT)");
    expect(page).toContain("resetPayrollCycleUat");
    expect(page).toContain("canResetPayrollCycleUat");
    expect(page).toContain("actualCan");
    expect(page).toContain("This action is intended for UAT only.");
    expect(page).toContain("available only for non-production payroll cycles");
    expect(page).toContain("This action cannot be undone.");
  });
});
