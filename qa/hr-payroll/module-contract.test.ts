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
  "20260717120032_hr_payroll_ess_document_storage_access.sql",
  "20260717120033_hr_payroll_employment_types_companies.sql",
  "20260717120034_hr_payroll_leave_casual_sick_policy.sql",
  "20260717120035_hr_payroll_policy_rules_engine.sql",
  "20260717120036_hr_payroll_sandwich_night_est.sql",
  "20260717120037_hr_payroll_leave_duration_document.sql",
  "20260717120038_hr_payroll_punch_anytime_overnight.sql",
  "20260717120039_hr_payroll_companies_accounting_sync.sql",
  "20260717120040_hr_payroll_punch_24h_all_shifts.sql",
  "20260717120041_hr_payroll_punch_close_locked_open.sql",
  "20260717120042_hr_payroll_attendance_columns_catchup.sql",
  "20260717120043_hr_payroll_punch_final.sql",
  "20260720120000_hr_payroll_module_restructure_rbac.sql",
  "20260721120000_hr_payroll_crm_masters_foundation.sql",
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
  "fn_employee_shift_at",
  "fn_locked_payroll_cycle_for_date",
];

const REQUIRED_PAGES = [
  "HrDashboardPage.tsx",
  "HrEssPage.tsx",
  "HrEmployeesPage.tsx",
  "HrDocumentTypesPage.tsx",
  "HrEmployeeCategoriesPage.tsx",
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

  it("migration 38 punch anytime and overnight off-shift", () => {
    const m38 = readFileSync(
      join(MIGRATIONS, "20260717120038_hr_payroll_punch_anytime_overnight.sql"),
      "utf8",
    );
    expect(m38).toContain("fn_record_punch");
    expect(m38).toContain("fn_time_minutes_span");
    expect(m38).not.toContain("Check-in too early");
    expect(m38).toContain("in_shift");
    const punch = readFileSync(join(ROOT, "src/hr-payroll/components/attendance/PunchStation.tsx"), "utf8");
    expect(punch).toContain("punch anytime");
    expect(punch).toContain("off-shift");
  });

  it("migration 40 punch 24h all shifts including overnight night", () => {
    const m40 = readFileSync(
      join(MIGRATIONS, "20260717120040_hr_payroll_punch_24h_all_shifts.sql"),
      "utf8",
    );
    expect(m40).toContain("fn_record_punch");
    expect(m40).not.toContain("Check-in too early");
    expect(m40).toContain("fn_punch_on_timeline");
    expect(m40).toContain("fn_is_late_check_in");
    const session = readFileSync(join(ROOT, "src/hr-payroll/lib/punchSession.ts"), "utf8");
    expect(session).toContain("resolvePunchSession");
  });

  it("migration 41 allows checkout on open session in locked cycle", () => {
    const m41 = readFileSync(
      join(MIGRATIONS, "20260717120041_hr_payroll_punch_close_locked_open.sql"),
      "utf8",
    );
    expect(m41).toContain("fn_attendance_close_only_update");
    expect(m41).toContain("check_out IS NULL");
  });

  it("migration 42 adds shift_work_min columns for punch trigger", () => {
    const m42 = readFileSync(
      join(MIGRATIONS, "20260717120042_hr_payroll_attendance_columns_catchup.sql"),
      "utf8",
    );
    expect(m42).toContain("shift_work_min");
    expect(m42).toContain("off_shift_min");
  });

  it("migration 43 final punch — self-service never blocked by cycle lock", () => {
    const m43 = readFileSync(
      join(MIGRATIONS, "20260717120043_hr_payroll_punch_final.sql"),
      "utf8",
    );
    expect(m43).toContain("source, 'self'");
    expect(m43).toContain("fn_start_attendance_day");
    expect(m43).not.toContain("Check-in too early");
    const punch = readFileSync(join(ROOT, "src/hr-payroll/components/attendance/PunchStation.tsx"), "utf8");
    expect(punch).toContain("Check In again");
    expect(punch).toContain("timezone");
  });

  it("migration 36 sandwich half-day exception and 5-day night EST", () => {
    const m36 = readFileSync(
      join(MIGRATIONS, "20260717120036_hr_payroll_sandwich_night_est.sql"),
      "utf8",
    );
    expect(m36).toContain("fn_sandwich_half_day_exception");
    expect(m36).toContain("half_day_exception");
    expect(m36).toContain("fn_leave_entitlement_for_employee");
    expect(m36).toContain("five_day_night_timezone");
    expect(m36).toContain("America/Toronto");
    const policy = readFileSync(join(ROOT, "src/hr-payroll/lib/leavePolicy.ts"), "utf8");
    expect(policy).toContain("LEAVE_ENTITLED_5DAY_NIGHT");
    expect(policy).toContain("isFiveDayNightEst");
  });

  it("migration 35 policy rules engine", () => {
    const m35 = readFileSync(
      join(MIGRATIONS, "20260717120035_hr_payroll_policy_rules_engine.sql"),
      "utf8",
    );
    expect(m35).toContain("fn_validate_leave_rules");
    expect(m35).toContain("fn_finalize_leave_on_approve");
    expect(m35).toContain("six_day_casual");
    expect(m35).toContain("full_day_after_min");
    expect(m35).toContain("fn_apply_holidays_for_date");
    expect(m35).toContain("training_unpaid_cap");
    const policy = readFileSync(join(ROOT, "src/hr-payroll/lib/leavePolicy.ts"), "utf8");
    expect(policy).toContain("LEAVE_ENTITLED");
    expect(policy).toContain("validateLeaveNotice");
    expect(policy).toContain("lateDeductionFromSlab");
  });

  it("leave list opens detail modal on row click", () => {
    const leavePage = readFileSync(join(ROOT, "src/hr-payroll/pages/HrLeavePage.tsx"), "utf8");
    expect(leavePage).toContain("LeaveDetailModal");
    expect(leavePage).toContain("setDetailRow(l)");
    expect(leavePage).toContain("Leave request details");
  });

  it("pending leave can be cancelled by employee or HR from list and detail", () => {
    const leavePage = readFileSync(join(ROOT, "src/hr-payroll/pages/HrLeavePage.tsx"), "utf8");
    expect(leavePage).toContain("canCancelLeaveRequest");
    expect(leavePage).toContain("cancelLeave");
    expect(leavePage).toContain("status: \"Cancelled\"");
    expect(leavePage).toContain("cancelled_at");
    expect(leavePage).toContain("Cancel request");
    expect(leavePage).toContain("selfEmployeeId");
  });

  it("payroll verify page filters by country, branch, and payroll company", () => {
    const verifyPage = readFileSync(join(ROOT, "src/hr-payroll/pages/HrVerifyPage.tsx"), "utf8");
    expect(verifyPage).toContain("PAYROLL_VERIFY_COUNTRIES");
    expect(verifyPage).toContain("filterPayrollLines");
    expect(verifyPage).toContain("Payroll Country");
    expect(verifyPage).toContain("Payroll Company");
    expect(verifyPage).toContain("branchesForPayrollCountry");
    expect(verifyPage).toContain("companiesForPayrollCountryFilter");
  });

  it("payroll verify page supports date range, cycle, and status filters", () => {
    const verifyPage = readFileSync(join(ROOT, "src/hr-payroll/pages/HrVerifyPage.tsx"), "utf8");
    expect(verifyPage).toContain("From Date");
    expect(verifyPage).toContain("To Date");
    expect(verifyPage).toContain("Payroll Cycle");
    expect(verifyPage).toContain("Payroll Status");
    expect(verifyPage).toContain("useHrPayrollLinesMulti");
    expect(verifyPage).toContain("cyclesMatchingVerifyFilters");
    expect(verifyPage).toContain("PAYROLL_VERIFY_STATUSES");
  });

  it("allows leave type selection before dates are filled", () => {
    const leavePage = readFileSync(join(ROOT, "src/hr-payroll/pages/HrLeavePage.tsx"), "utf8");
    expect(leavePage).not.toContain("disabled={resolution.forcedUnpaid}");
    expect(leavePage).toContain("leaveTypeOptionHint");
  });

  it("leave apply form supports duration and document upload", () => {
    const leavePage = readFileSync(join(ROOT, "src/hr-payroll/pages/HrLeavePage.tsx"), "utf8");
    const policy = readFileSync(join(ROOT, "src/hr-payroll/lib/leavePolicy.ts"), "utf8");
    const m37 = readFileSync(
      join(MIGRATIONS, "20260717120037_hr_payroll_leave_duration_document.sql"),
      "utf8",
    );
    expect(m37).toContain("duration_type");
    expect(m37).toContain("half_day_part");
    expect(policy).toContain("LEAVE_DURATION_HALF");
    expect(policy).toContain("HALF_DAY_PARTS");
    expect(leavePage).toContain("Leave Duration");
    expect(leavePage).toContain("uploadHrDocument");
    expect(leavePage).toContain("half_day_part");
  });

  it("leave apply policy: casual/sick only with monthly cap", () => {
    const leavePage = readFileSync(join(ROOT, "src/hr-payroll/pages/HrLeavePage.tsx"), "utf8");
    const policy = readFileSync(join(ROOT, "src/hr-payroll/lib/leavePolicy.ts"), "utf8");
    expect(policy).toContain("PAID_APPLY_LEAVE_TYPES");
    expect(policy).toContain("MONTHLY_PAID_LEAVE_CAP = 1.5");
    expect(leavePage).toContain("leavePolicy");
    expect(leavePage).not.toContain('"Annual Leave"');
    const m34 = readFileSync(
      join(MIGRATIONS, "20260717120034_hr_payroll_leave_casual_sick_policy.sql"),
      "utf8",
    );
    expect(m34).toContain("fn_leave_monthly_paid_used");
    expect(m34).toContain("fn_apply_leave_type_policy");
    expect(m34).toContain("Casual Leave");
  });

  it("employee categories and payroll company labels", () => {
    const form = readFileSync(
      join(ROOT, "src/hr-payroll/components/employees/EmployeeFormModal.tsx"),
      "utf8",
    );
    const catalog = readFileSync(join(ROOT, "src/hr-payroll/lib/payrollCompanies.ts"), "utf8");
    const constants = readFileSync(join(ROOT, "src/hr-payroll/lib/constants.ts"), "utf8");
    const foundation = readFileSync(
      join(MIGRATIONS, "20260721120000_hr_payroll_crm_masters_foundation.sql"),
      "utf8",
    );
    expect(foundation).toContain("hr_employee_categories");
    expect(foundation).toContain("'Permanent'");
    expect(constants).not.toContain("EMPLOYMENT_TYPES");
    expect(constants).toContain("Future Link Academic Excellence Pvt Ltd");
    expect(catalog).not.toContain("Academic Services");
    expect(catalog).toContain("Future Link Consultants Pvt Ltd");
    expect(catalog).toContain("Futureway Consultants Inc");
    expect(form).toContain("employee_category_id");
    expect(form).not.toContain("EMPLOYMENT_TYPE_OPTIONS");
    expect(form).not.toMatch(/Employment Type/);
    expect(form).toContain("Payroll entity type");
    expect(form).toContain("PAYROLL_ENTITY_REGIONS");
    expect(form).toContain("payrollCompanyLabel");
    const m39 = readFileSync(
      join(MIGRATIONS, "20260717120039_hr_payroll_companies_accounting_sync.sql"),
      "utf8",
    );
    expect(m39).toContain("Future Link Academic Excellence Pvt Ltd");
    expect(m39).toContain("DELETE FROM companies");
  });

  it("Phase 1 foundation: category master without leave/payroll behavior changes", () => {
    const foundation = readFileSync(
      join(MIGRATIONS, "20260721120000_hr_payroll_crm_masters_foundation.sql"),
      "utf8",
    );
    const policy = readFileSync(join(ROOT, "src/hr-payroll/lib/leavePolicy.ts"), "utf8");
    expect(foundation).toContain("v_hr_employee_category_review");
    expect(foundation).not.toMatch(/CREATE OR REPLACE FUNCTION fn_is_leave_eligible/i);
    expect(foundation).not.toMatch(/CREATE OR REPLACE FUNCTION fn_rollup_inputs/i);
    expect(foundation).not.toContain("sync_employment_type_from_category");
    expect(foundation).toContain("no catch-all");
    expect(policy).toContain("hr_employee_categories");
    expect(policy).toContain("leave_eligible");
    const categoryOnly = readFileSync(
      join(MIGRATIONS, "20260721120001_hr_payroll_category_only_classification.sql"),
      "utf8",
    );
    expect(categoryOnly).toContain("fn_is_leave_eligible");
    expect(categoryOnly).toContain("DROP NOT NULL");
  });

  it("ESS uses linked staff_id not employee picker", () => {
    const ess = readFileSync(join(ROOT, "src/hr-payroll/pages/HrEssPage.tsx"), "utf8");
    expect(ess).toContain("staff_id");
    expect(ess).not.toContain("EmployeeSeg");
    expect(ess).toContain("EmployeeDocumentsPanel");
    expect(ess).toContain("essOnly");
  });

  it("ESS documents panel supports view and download", () => {
    const panel = readFileSync(
      join(ROOT, "src/hr-payroll/components/employees/EmployeeDocumentsPanel.tsx"),
      "utf8",
    );
    expect(panel).toContain("essOnly");
    expect(panel).toContain("View");
    expect(panel).toContain("Download");
    expect(panel).toContain("getHrDocumentSignedUrl");
  });
});
