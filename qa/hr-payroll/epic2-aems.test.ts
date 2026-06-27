import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { MASTER_DOMAIN_REGISTRY } from "@/hr-payroll/lib/masterDataRegistry";
import { ALL_HR_SCREENS, HR_SCREEN_ROUTES } from "@/hr-payroll/lib/constants";
import { AEMS_STATUS_LABEL } from "@/hr-payroll/lib/aemsTypes";

const MIGRATION = join(process.cwd(), "supabase/migrations/20260733120000_hr_aems_pack22.sql");

describe("WTM Pack 2.2 — AEMS", () => {
  it("migration defines AEMS tables and RPCs", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("attendance_exceptions");
    expect(sql).toContain("workforce_incidents");
    expect(sql).toContain("aems_exception_evidence");
    expect(sql).toContain("fn_aems_submit_exception");
    expect(sql).toContain("fn_aems_hr_action");
    expect(sql).not.toContain("CREATE OR REPLACE FUNCTION fn_compute_payroll");
  });

  it("registers exception types in master data", () => {
    const codes = MASTER_DOMAIN_REGISTRY.map((d) => d.id);
    expect(codes).toContain("attendance_exception_type");
    expect(codes).toContain("workforce_incident_type");
  });

  it("has AEMS screen routes", () => {
    expect(ALL_HR_SCREENS).toContain("attendanceExceptions");
    expect(ALL_HR_SCREENS).toContain("incidentRegister");
    expect(HR_SCREEN_ROUTES.attendanceExceptions).toBe("/hr/attendance/exceptions");
    expect(HR_SCREEN_ROUTES.incidentRegister).toBe("/hr/admin/incidents");
  });

  it("defines exception status labels", () => {
    expect(Object.keys(AEMS_STATUS_LABEL).length).toBeGreaterThanOrEqual(7);
  });
});
