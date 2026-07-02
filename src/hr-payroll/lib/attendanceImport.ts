/**
 * HR-22 — attendance CSV import parsing/validation.
 *
 * Pure helpers so the import preview can validate live (as the user types) and be
 * unit-tested independently of the page.
 */

export type ParsedAttendanceRow = {
  emp_code: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  employee_id?: string;
  error?: string;
};

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row;
  });
}

/** Parse + validate raw CSV against known employee codes. Returns one row per data line. */
export function buildAttendanceImportRows(
  text: string,
  empByCode: Map<string, string>,
): ParsedAttendanceRow[] {
  return parseCsv(text).map((r) => {
    const code = (r.emp_code ?? r.employee_code ?? r.id ?? "").trim();
    const empId = empByCode.get(code.toLowerCase());
    const workDate = r.work_date ?? r.date ?? "";
    const status = r.status || "Present";
    if (!code)
      return { emp_code: "", work_date: workDate, check_in: null, check_out: null, status, error: "Missing emp_code" };
    if (!empId)
      return { emp_code: code, work_date: workDate, check_in: null, check_out: null, status, error: "Unknown employee" };
    if (!workDate)
      return { emp_code: code, work_date: "", check_in: null, check_out: null, status, error: "Missing date" };
    return {
      emp_code: code,
      work_date: workDate,
      check_in: r.check_in || r.in || null,
      check_out: r.check_out || r.out || null,
      status,
      employee_id: empId,
    };
  });
}

export function summarizeAttendanceImport(rows: ParsedAttendanceRow[]): {
  valid: number;
  errors: number;
} {
  let valid = 0;
  let errors = 0;
  for (const r of rows) {
    if (r.error) errors += 1;
    else if (r.employee_id) valid += 1;
  }
  return { valid, errors };
}
