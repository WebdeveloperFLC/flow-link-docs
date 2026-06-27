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
  "20260721120001_hr_payroll_category_only_classification.sql",
  "20260719120100_hr_payroll_employee_assets.sql",
  "20260724120000_hr_training_completion_workflow.sql",
  "20260725120000_hr_training_approval_fixes.sql",
  "20260726120000_hr_training_admin_bypass.sql",
  "20260722120000_hr_payroll_attendance_hours_status.sql",
  "20260722120100_hr_payroll_attendance_dynamic_shift_thresholds.sql",
  "20260722120200_hr_payroll_weekly_off_automation.sql",
  "20260727120000_hr_payroll_phase_c_earned_days_engine.sql",
  "20260728120000_hr_payroll_salary_structure_statutory.sql",
  "20260729120000_hr_payroll_salary_structure_engine.sql",
  "20260730120000_hr_payroll_salary_payable_days_engine.sql",
  "20260731120000_hr_wpms_master_data_foundation.sql",
  "20260732120000_hr_wtm_attendance_foundation.sql",
  "20260733120000_hr_aems_pack22.sql",
  "20260734120000_hr_wre_pack23.sql",
  "20260735120000_hr_wtm_smoke_p1_fixes.sql",
];

const REQUIRED_RPCS = [
  "fn_compute_payroll",
  "fn_build_payroll_line",
  "fn_resolve_employee_salary_structure",
  "fn_employee_salary_structure_enabled",
  "fn_compute_salary_payable_days",
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
  "fn_apply_weekly_offs_for_range",
  "fn_compare_payroll_formulas",
  "fn_apply_priority_matrix_c17",
  "fn_rollup_inputs_legacy",
  "fn_rollup_inputs_earned",
  "fn_employee_shift_at",
  "fn_locked_payroll_cycle_for_date",
  "fn_extend_training",
  "fn_request_training_completion",
  "fn_complete_training_direct",
  "fn_finalize_training_on_approve",
  "fn_wpms_assign_bundle",
  "fn_wpms_bulk_assign_bundle",
  "fn_wpms_log_event",
  "fn_wtm_clock_in",
  "fn_wtm_clock_out",
  "fn_wtm_break_out",
  "fn_wtm_break_in",
  "fn_wtm_get_session",
  "fn_wtm_log_event",
  "fn_wtm_sync_attendance_rollup",
  "fn_aems_submit_exception",
  "fn_aems_hr_action",
  "fn_aems_manual_attendance",
  "fn_aems_bulk_process",
  "fn_aems_register_evidence",
  "fn_aems_apply_session_correction",
  "fn_aems_find_matching_incidents",
  "fn_wre_evaluate_session",
  "fn_wre_reevaluate",
  "fn_wpms_employee_bundle_at",
  "fn_wpms_policy_config_at",
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

  it("holiday calendar supports apply actions and list filters", () => {
    const holidaysPage = readFileSync(join(ROOT, "src/hr-payroll/pages/HrHolidaysPage.tsx"), "utf8");
    expect(holidaysPage).toContain("Apply Holiday");
    expect(holidaysPage).toContain("Apply Holidays for Month");
    expect(holidaysPage).toContain("applyHolidaysForDate");
    expect(holidaysPage).toContain("filterHolidays");
    expect(holidaysPage).toContain("Holiday Type");
  });

  it("leave page includes summary panel with year filter", () => {
    const leavePage = readFileSync(join(ROOT, "src/hr-payroll/pages/HrLeavePage.tsx"), "utf8");
    expect(leavePage).toContain("LeaveSummaryPanel");
    expect(readFileSync(join(ROOT, "src/hr-payroll/components/leave/LeaveSummaryPanel.tsx"), "utf8")).toContain(
      "Remaining",
    );
  });

  it("late and mispunch pages support request submission", () => {
    const late = readFileSync(join(ROOT, "src/hr-payroll/pages/HrLatePage.tsx"), "utf8");
    const mispunch = readFileSync(join(ROOT, "src/hr-payroll/pages/HrMispunchPage.tsx"), "utf8");
    expect(late).toContain("late_exemptions");
    expect(late).toContain("Request Exemption");
    expect(mispunch).toContain("mispunch_requests");
    expect(mispunch).toContain("Request Regularization");
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

  it("training workflow migrations and UI are present", () => {
    const train = readFileSync(
      join(MIGRATIONS, "20260724120000_hr_training_completion_workflow.sql"),
      "utf8",
    );
    expect(train).toContain("Pending Manager Approval");
    expect(train).toContain("fn_request_training_completion");
    const adminBypass = readFileSync(
      join(MIGRATIONS, "20260726120000_hr_training_admin_bypass.sql"),
      "utf8",
    );
    expect(adminBypass).toContain("fn_complete_training_direct");
    const trainingPage = readFileSync(join(ROOT, "src/hr-payroll/pages/HrTrainingPage.tsx"), "utf8");
    expect(trainingPage).toContain("TrainingDetailModal");
    expect(trainingPage).toContain("canBypassTrainingApproval");
  });

  it("config hub labels placeholder sections as Coming soon", () => {
    const hub = readFileSync(join(ROOT, "src/hr-payroll/pages/HrConfigHubPage.tsx"), "utf8");
    const structure = readFileSync(join(ROOT, "src/hr-payroll/lib/moduleStructure.ts"), "utf8");
    expect(hub).toContain("Coming soon");
    expect(structure).toContain("comingSoon: true");
    expect(structure).toContain("org-settings");
  });

  it("all HR report pages exist and hub routes each report id", () => {
    const reportsPage = readFileSync(join(ROOT, "src/hr-payroll/pages/HrReportsPage.tsx"), "utf8");
    const structure = readFileSync(join(ROOT, "src/hr-payroll/lib/moduleStructure.ts"), "utf8");
    const reportIds = [...structure.matchAll(/id: "([^"]+)", title: "[^"]+ Report"/g)].map((m) => m[1]);
    expect(reportIds.length).toBeGreaterThanOrEqual(9);
    for (const id of reportIds) {
      const fileName = `Hr${id
        .split("-")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join("")}ReportPage.tsx`;
      const altName =
        id === "salary-register"
          ? "HrSalaryRegisterReportPage.tsx"
          : id === "attendance"
            ? "HrAttendanceReportPage.tsx"
            : fileName;
      expect(
        existsSync(join(ROOT, "src/hr-payroll/pages/reports", altName)),
        `missing report page for ${id}`,
      ).toBe(true);
      expect(reportsPage).toContain(id);
    }
    expect(reportsPage).not.toContain("coming in the next build phase");
    expect(reportsPage).not.toContain("roll out incrementally");
  });

  it("sidebar nav groups attendance sub-modules under workforce management", () => {
    const nav = readFileSync(join(ROOT, "src/hr-payroll/lib/nav.ts"), "utf8");
    const routes = readFileSync(join(ROOT, "src/hr-payroll/HrPayrollRoutes.tsx"), "utf8");
    expect(nav).toContain("Workforce Management");
    expect(nav).not.toContain("Comp-Off Management");
    expect(nav).toContain("Roles & Access");
    expect(routes).toContain("AttendanceModuleLayout");
    expect(routes).toContain("path=\"records\" element={<HrAttendancePage />}");
    expect(routes).toContain("Navigate to=\"/hr/attendance/compoff\"");
    const approvals = readFileSync(join(ROOT, "src/hr-payroll/pages/HrApprovalsPage.tsx"), "utf8");
    expect(approvals).toContain("approval-category-card");
    expect(approvals).not.toContain("Open full module");
  });

  it("migration Phase B weekly off automation", () => {
    const m = readFileSync(
      join(MIGRATIONS, "20260722120200_hr_payroll_weekly_off_automation.sql"),
      "utf8",
    );
    expect(m).toContain("fn_apply_weekly_offs_for_cycle");
    expect(m).toContain("fn_employee_work_week_at");
    expect(m).toContain("fn_is_weekly_off_day");
    expect(m).toContain("fn_employee_shift_at");
    expect(m).toContain("five_day_off_dow");
    expect(m).toContain("six_day_off_dow");
    expect(m).toContain("Holiday");
    expect(m).toContain("fn_rebuild_cycle_lines");
    const weeklyOff = readFileSync(join(ROOT, "src/hr-payroll/lib/weeklyOff.ts"), "utf8");
    expect(weeklyOff).toContain("shouldStampWeeklyOff");
    const attHook = readFileSync(join(ROOT, "src/hr-payroll/hooks/useHrAttendance.ts"), "utf8");
    expect(attHook).toContain("syncWeeklyOffsForRange");
  });

  it("migration Phase C earned days engine (legacy default)", () => {
    const m = readFileSync(
      join(MIGRATIONS, "20260727120000_hr_payroll_phase_c_earned_days_engine.sql"),
      "utf8",
    );
    expect(m).toContain('"formula_mode":"legacy"');
    expect(m).toContain("fn_rollup_inputs_legacy");
    expect(m).toContain("fn_rollup_inputs_earned");
    expect(m).toContain("fn_apply_priority_matrix_c17");
    expect(m).toContain("fn_compare_payroll_formulas");
    expect(m).toContain("HR_PAYROLL_PHASE_C_LOCKED_SPEC.md");
    const spec = readFileSync(join(ROOT, "docs/HR_PAYROLL_PHASE_C_LOCKED_SPEC.md"), "utf8");
    expect(spec).toContain("C1");
    expect(spec).toContain("2.0");
    const resolver = readFileSync(join(ROOT, "src/hr-payroll/lib/earnedDaysResolver.ts"), "utf8");
    expect(resolver).toContain("HR_PAYROLL_PHASE_C_LOCKED_SPEC.md");
  });

  it("migration salary structure engine (Phase 1)", () => {
    const schema = readFileSync(
      join(MIGRATIONS, "20260728120000_hr_payroll_salary_structure_statutory.sql"),
      "utf8",
    );
    expect(schema).toContain("salary_structure_enabled");
    expect(schema).toContain("structure_difference");
    const engine = readFileSync(
      join(MIGRATIONS, "20260729120000_hr_payroll_salary_structure_engine.sql"),
      "utf8",
    );
    expect(engine).toContain("fn_resolve_employee_salary_structure");
    expect(engine).toContain("p_structure_enabled");
    expect(engine).toContain("salary_structure_mode");
    expect(engine).toContain("calc_snapshot");
  });

  it("migration salary payable days engine (Phase 2A)", () => {
    const m = readFileSync(
      join(MIGRATIONS, "20260730120000_hr_payroll_salary_payable_days_engine.sql"),
      "utf8",
    );
    expect(m).toContain("fn_compute_salary_payable_days");
    expect(m).toContain("payable_days_breakdown");
    expect(m).toContain("e.monthly_gross");
  });
});
