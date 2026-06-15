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
  "20260717120018_hr_payroll_add_up_requirements.sql",
  "20260717120019_hr_payroll_lifecycle_salary_revision.sql",
  "20260717120020_hr_payroll_canada_engine.sql",
  "20260717120021_hr_payroll_uat_isha_link.sql",
  "20260717120022_hr_payroll_phase2c_rbac_snapshots.sql",
  "20260717120023_hr_payroll_fl_ca01_payroll_line.sql",
  "20260717120024_hr_payroll_demo_crm_staff_access.sql",
  "20260717120025_hr_payroll_isha_tv02_pt_and_crm_grants.sql",
  "20260717120026_hr_payroll_crm_list_fix_reopen_paid.sql",
  "20260717120027_hr_payroll_professional_tax_all_india.sql",
  "20260717120028_hr_payroll_document_types_master.sql",
  "20260717120029_hr_payroll_document_master_rbac.sql",
  "20260717120030_hr_payroll_punch_24h_window.sql",
  "20260717120031_hr_payroll_shift_salary_offshift_split.sql",
];

const REQUIRED_RPCS = [
  "fn_compute_payroll",
  "fn_build_payroll_line",
  "fn_start_attendance_day",
  "fn_record_punch",
  "fn_export_payroll_register",
  "fn_ensure_my_employee_profile",
  "fn_process_approval_decision",
  "fn_process_payroll_cycle",
  "fn_approve_payroll_cycle",
  "fn_mark_payroll_paid",
  "fn_sync_hr_role_from_crm",
  "fn_sync_all_crm_hr_roles",
  "fn_capture_payroll_snapshots",
];

const REQUIRED_PAGES = [
  "HrDashboardPage.tsx",
  "HrEssPage.tsx",
  "HrEmployeesPage.tsx",
  "HrDocumentTypesPage.tsx",
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
    const m17 = readFileSync(
      join(MIGRATIONS, "20260717120017_hr_payroll_testing_changes.sql"),
      "utf8",
    );
    expect(m17).toContain("p_ot_minutes");
    expect(m17).toContain("p_pt_applicable");
    expect(m17).toContain("pt_employee");
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

  it("HrConfigPage exposes Professional Tax policy tab", () => {
    const config = readFileSync(join(ROOT, "src/hr-payroll/pages/HrConfigPage.tsx"), "utf8");
    expect(config).toContain("Professional Tax");
    expect(config).toContain("saveProfessionalTax");
    expect(config).toContain("default_amount");
  });

  it("migration 27 enables PT for India employees", () => {
    const m27 = readFileSync(
      join(MIGRATIONS, "20260717120027_hr_payroll_professional_tax_all_india.sql"),
      "utf8",
    );
    expect(m27).toContain("professional_tax");
    expect(m27).toContain("pt_applicable = true");
    expect(m27).toContain("default_amount");
  });

  it("migration 30 allows 24h punch without shift-window block", () => {
    const m30 = readFileSync(
      join(MIGRATIONS, "20260717120030_hr_payroll_punch_24h_window.sql"),
      "utf8",
    );
    expect(m30).toContain("fn_record_punch");
    expect(m30).not.toContain("Check-in too early");
    expect(m30).not.toContain("Check-out too late");
    expect(m30).toContain("p_logout");
  });

  it("migration 31 splits shift salary hours vs off-shift performance", () => {
    const m31 = readFileSync(
      join(MIGRATIONS, "20260717120031_hr_payroll_shift_salary_offshift_split.sql"),
      "utf8",
    );
    expect(m31).toContain("fn_calc_shift_hour_split");
    expect(m31).toContain("off_shift_min");
    expect(m31).toContain("off_shift_minutes");
    expect(m31).toContain("ot_minutes");
    expect(m31).toContain("performance-only");
  });

  it("ESS uses linked staff_id not employee picker", () => {
    const ess = readFileSync(join(ROOT, "src/hr-payroll/pages/HrEssPage.tsx"), "utf8");
    expect(ess).toContain("staff_id");
    expect(ess).not.toContain("EmployeeSeg");
  });
});
