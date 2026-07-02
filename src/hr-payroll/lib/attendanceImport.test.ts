import { describe, it, expect } from "vitest";
import {
  buildAttendanceImportRows,
  summarizeAttendanceImport,
  parseCsv,
} from "./attendanceImport";

const emp = new Map<string, string>([["fl-1042", "e1"]]);

describe("parseCsv", () => {
  it("returns [] for empty or header-only input", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("emp_code,work_date")).toEqual([]);
  });
  it("maps headers (lowercased, spaces→underscore) to values", () => {
    const rows = parseCsv("Emp Code,Work Date\nFL-1042,2026-06-01");
    expect(rows[0]).toMatchObject({ emp_code: "FL-1042", work_date: "2026-06-01" });
  });
});

describe("buildAttendanceImportRows", () => {
  it("resolves a valid row to an employee id with no error", () => {
    const rows = buildAttendanceImportRows(
      "emp_code,work_date,check_in,check_out,status\nFL-1042,2026-06-01,10:02,19:05,Present",
      emp,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].employee_id).toBe("e1");
    expect(rows[0].error).toBeUndefined();
  });

  it("flags missing emp_code, unknown employee, and missing date", () => {
    const rows = buildAttendanceImportRows(
      [
        "emp_code,work_date,status",
        ",2026-06-01,Present", // missing code
        "FL-9999,2026-06-01,Present", // unknown
        "FL-1042,,Present", // missing date
      ].join("\n"),
      emp,
    );
    expect(rows.map((r) => r.error)).toEqual([
      "Missing emp_code",
      "Unknown employee",
      "Missing date",
    ]);
  });

  it("defaults status to Present and accepts in/out aliases", () => {
    const rows = buildAttendanceImportRows("emp_code,date,in,out\nFL-1042,2026-06-01,09:00,18:00", emp);
    expect(rows[0].status).toBe("Present");
    expect(rows[0].check_in).toBe("09:00");
    expect(rows[0].check_out).toBe("18:00");
  });
});

describe("summarizeAttendanceImport", () => {
  it("counts valid vs error rows", () => {
    const rows = buildAttendanceImportRows(
      ["emp_code,work_date", "FL-1042,2026-06-01", "FL-9999,2026-06-01"].join("\n"),
      emp,
    );
    expect(summarizeAttendanceImport(rows)).toEqual({ valid: 1, errors: 1 });
  });
});
