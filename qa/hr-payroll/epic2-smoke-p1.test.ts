import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260735120000_hr_wtm_smoke_p1_fixes.sql",
);

describe("WTM v1.0 Smoke P1 fixes", () => {
  it("restores fn_employee_shift_at and CRM grants", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("fn_employee_shift_at");
    expect(sql).toContain("employee_shift_history");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION");
    expect(sql).toContain("fn_list_crm_staff");
    expect(sql).toContain("fn_import_crm_staff_as_employee");
    expect(sql).not.toContain("fn_compute_payroll");
  });

  it("uses upsert-safe attendance day start", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("ON CONFLICT (employee_id, work_date)");
    expect(sql).toContain("attendance_employee_id_work_date_key");
  });

  it("guards designation_id backfill when CRM masters migration incomplete", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS designation_id");
    expect(sql).not.toContain("trim(d.designation)");
    expect(sql).toContain("information_schema.columns");
  });
});
