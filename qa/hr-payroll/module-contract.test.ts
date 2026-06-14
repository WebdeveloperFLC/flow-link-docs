import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { ALL_HR_SCREENS, HR_ROLE_LIST, HR_SCREEN_ROUTES } from "@/hr-payroll/lib/constants";
import { HR_NAV } from "@/hr-payroll/lib/nav";
import { DEFAULT_ACCESS_BY_ROLE } from "@/hr-payroll/lib/defaultAccess";

const ROOT = join(process.cwd());
const MIGRATIONS = join(ROOT, "supabase/migrations");

const REQUIRED_MIGRATIONS = [
  "20260717120000_hr_payroll_schema.sql",
  "20260717120001_hr_payroll_rls.sql",
  "20260717120012_hr_payroll_policy_engine_approvals.sql",
  "20260717120013_hr_payroll_lock_export_punch.sql",
  "20260717120014_hr_payroll_overtime_pay.sql",
  "20260717120015_hr_payroll_punch_work_date.sql",
  "20260717120016_hr_payroll_ess_self_profile.sql",
  "20260717120017_hr_payroll_testing_changes.sql",
];

const REQUIRED_RPCS = [
  "fn_compute_payroll",
  "fn_build_payroll_line",
  "fn_start_attendance_day",
  "fn_record_punch",
  "fn_export_payroll_register",
  "fn_ensure_my_employee_profile",
  "fn_process_approval_decision",
];

const REQUIRED_PAGES = [
  "HrDashboardPage.tsx",
  "HrEssPage.tsx",
  "HrEmployeesPage.tsx",
  "HrVerifyPage.tsx",
  "HrAttendancePage.tsx",
  "HrLeavePage.tsx",
  "HrConfigPage.tsx",
  "HrRolesPage.tsx",
];

describe("HR Payroll module contract", () => {
  it("all required SQL migrations exist", () => {
    for (const f of REQUIRED_MIGRATIONS) {
      expect(existsSync(join(MIGRATIONS, f)), `missing ${f}`).toBe(true);
    }
  });

  it("latest migrations define required RPCs", () => {
    const sql = REQUIRED_MIGRATIONS.map((f) =>
      readFileSync(join(MIGRATIONS, f), "utf8"),
    ).join("\n");
    for (const rpc of REQUIRED_RPCS) {
      expect(sql).toContain(rpc);
    }
  });

  it("every HR screen has a route", () => {
    for (const key of ALL_HR_SCREENS) {
      expect(HR_SCREEN_ROUTES[key]).toBeTruthy();
    }
  });

  it("nav items map to known screens", () => {
    const keys = HR_NAV.flatMap((g) => g.items.map((i) => i.k));
    for (const k of keys) {
      expect(ALL_HR_SCREENS).toContain(k);
    }
  });

  it("all HR roles have default access matrix", () => {
    for (const role of HR_ROLE_LIST) {
      expect(DEFAULT_ACCESS_BY_ROLE[role]).toBeDefined();
      expect(DEFAULT_ACCESS_BY_ROLE[role].perms.view).toBeDefined();
    }
  });

  it("required page components exist", () => {
    for (const p of REQUIRED_PAGES) {
      expect(existsSync(join(ROOT, "src/hr-payroll/pages", p))).toBe(true);
    }
  });

  it("HrPayrollProvider wraps routes", () => {
    const routes = readFileSync(join(ROOT, "src/hr-payroll/HrPayrollRoutes.tsx"), "utf8");
    expect(routes).toContain("HrPayrollProvider");
    expect(routes).toContain("HrPayrollLayout");
  });

  it("ESS uses linked staff_id not employee picker", () => {
    const ess = readFileSync(join(ROOT, "src/hr-payroll/pages/HrEssPage.tsx"), "utf8");
    expect(ess).toContain("staff_id");
    expect(ess).not.toContain("EmployeeSeg");
  });
});
