import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { WTM_PAYROLL_STATUS_LABEL } from "@/hr-payroll/lib/wreTypes";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260734120000_hr_wre_pack23.sql",
);

describe("WTM Pack 2.3 — Workforce Rules Engine", () => {
  it("migration defines evaluation tables and RPCs", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("wre_evaluations");
    expect(sql).toContain("wtm_attendance_snapshots");
    expect(sql).toContain("wtm_payroll_status");
    expect(sql).toContain("fn_wre_evaluate_session");
    expect(sql).toContain("fn_wre_reevaluate");
    expect(sql).toContain("fn_wpms_employee_bundle_at");
    expect(sql).toContain("fn_wpms_policy_config_at");
    expect(sql).not.toContain("CREATE OR REPLACE FUNCTION fn_compute_payroll");
  });

  it("hooks clock-out and AEMS correction to WRE", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("fn_wre_evaluate_session(s.id, 'clock_out'");
    expect(sql).toContain("fn_wre_evaluate_session(s.id, 'aems_correction'");
  });

  it("defines payroll status labels", () => {
    expect(Object.keys(WTM_PAYROLL_STATUS_LABEL)).toEqual(
      expect.arrayContaining(["Present", "Half Day", "Absent", "Holiday", "Weekly Off"]),
    );
  });
});
