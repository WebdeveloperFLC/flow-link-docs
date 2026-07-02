import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
import { HR_ORG_ID } from "../lib/constants";
import { hrAudit } from "../lib/hrApi";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  buildAttendanceImportRows,
  summarizeAttendanceImport,
} from "../lib/attendanceImport";

export default function HrImportPage() {
  const { can, fire } = useHrAccess();
  const qc = useQueryClient();
  const { data: employees = [] } = useHrEmployees();
  const [raw, setRaw] = useState("");
  const [importing, setImporting] = useState(false);

  const empByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.emp_code.toLowerCase(), e.id);
    return m;
  }, [employees]);

  // HR-22 — validate live as the user types (no separate "Preview" step).
  const preview = useMemo(
    () => buildAttendanceImportRows(raw, empByCode),
    [raw, empByCode],
  );

  const importRows = async () => {
    const valid = preview.filter((r) => r.employee_id && !r.error);
    if (!valid.length) {
      fire("No valid rows to import");
      return;
    }
    setImporting(true);
    let ok = 0;
    let fail = 0;
    for (const r of valid) {
      const { error } = await supabase.from("attendance" as never).upsert(
        {
          org_id: HR_ORG_ID,
          employee_id: r.employee_id,
          work_date: r.work_date,
          check_in: r.check_in || null,
          check_out: r.check_out || null,
          status: r.status,
          source: "import",
        } as never,
        { onConflict: "employee_id,work_date" },
      );
      if (error) fail++;
      else ok++;
    }
    setImporting(false);
    await hrAudit("Attendance Import", `${ok} rows`, "—", `${fail} failed`);
    fire(`Imported ${ok} rows${fail ? `, ${fail} failed` : ""}`);
    await qc.invalidateQueries({ queryKey: ["hr-attendance"] });
    setRaw("");
  };

  const { valid: validCount, errors: errCount } = summarizeAttendanceImport(preview);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ background: "#eef5ff", borderColor: "#cfe1f7" }}>
        <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          <strong>CSV attendance import.</strong> Expected columns:{" "}
          <span className="mono">emp_code, work_date, check_in, check_out, status</span>. Existing
          entries for the same employee and date are updated. Rows are validated as you type.
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Paste CSV</h3>
          <div className="row-flex" style={{ gap: 8 }}>
            {raw.trim() && (
              <span className="tag">
                {validCount} valid · {errCount} error{errCount === 1 ? "" : "s"}
              </span>
            )}
            {can("manageEmp") && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!validCount || importing}
                onClick={() => void importRows()}
              >
                {importing ? "Importing…" : `Import ${validCount} rows`}
              </button>
            )}
          </div>
        </div>
        <textarea
          className="input mono"
          rows={8}
          placeholder={`emp_code,work_date,check_in,check_out,status\nFL-1042,2026-06-01,10:02,19:05,Present`}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          disabled={!can("manageEmp")}
        />
      </div>

      {preview.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "auto" }}>
          <div className="card-h" style={{ padding: "14px 16px 0" }}>
            <h3 style={{ fontSize: 15 }}>Preview</h3>
            <span className="tag">
              {validCount} valid · {errCount} errors
            </span>
          </div>
          <table style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>Emp Code</th>
                <th>Date</th>
                <th>In</th>
                <th>Out</th>
                <th>Status</th>
                <th>Validation</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr
                  key={`${r.emp_code}-${r.work_date}-${i}`}
                  style={r.error ? { background: "#fff1f2" } : undefined}
                >
                  <td className="mono">{r.emp_code || "—"}</td>
                  <td>{r.work_date || "—"}</td>
                  <td className="mono">{r.check_in ?? "—"}</td>
                  <td className="mono">{r.check_out ?? "—"}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>
                    {r.error ? (
                      <span style={{ color: "var(--rose)", fontSize: 12 }}>{r.error}</span>
                    ) : (
                      <span className="badge b-approved">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
