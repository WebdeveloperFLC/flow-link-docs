import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { WTM_SESSION_STATUS_LABEL } from "@/hr-payroll/lib/wtmTypes";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260732120000_hr_wtm_attendance_foundation.sql",
);

describe("WTM Pack 2.1 — Attendance Foundation", () => {
  it("migration defines session model and RPCs", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("wtm_attendance_sessions");
    expect(sql).toContain("wtm_attendance_breaks");
    expect(sql).toContain("workforce_timeline_events");
    expect(sql).toContain("fn_wtm_clock_in");
    expect(sql).toContain("fn_wtm_clock_out");
    expect(sql).toContain("fn_wtm_break_out");
    expect(sql).toContain("fn_wtm_break_in");
    expect(sql).toContain("fn_wtm_sync_attendance_rollup");
    expect(sql).not.toContain("CREATE OR REPLACE FUNCTION fn_compute_payroll");
  });

  it("defines all session status labels", () => {
    expect(Object.keys(WTM_SESSION_STATUS_LABEL)).toEqual(
      expect.arrayContaining(["Pending", "Working", "On Break", "Completed", "Locked", "Exception", "Holiday", "Weekly Off"]),
    );
  });
});
