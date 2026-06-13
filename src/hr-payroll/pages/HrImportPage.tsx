import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
import { HR_ORG_ID } from "../lib/constants";
import { hrAudit } from "../lib/hrApi";
import { StatusBadge } from "../components/ui/StatusBadge";

type ParsedRow = {
  emp_code: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  employee_id?: string;
  error?: string;
};

function parseCsv(text: string): Record<string, string>[] {
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

export default function HrImportPage() {
  const { can, fire } = useHrAccess();
  const qc = useQueryClient();
  const { data: employees = [] } = useHrEmployees();
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);

  const empByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.emp_code.toLowerCase(), e.id);
    return m;
  }, [employees]);

  const buildPreview = () => {
    const rows = parseCsv(raw);
    const out: ParsedRow[] = rows.map((r) => {
      const code = (r.emp_code ?? r.employee_code ?? r.id ?? "").trim();
      const empId = empByCode.get(code.toLowerCase());
      const workDate = r.work_date ?? r.date ?? "";
      const status = r.status || "Present";
      if (!code) return { emp_code: "", work_date: workDate, check_in: null, check_out: null, status, error: "Missing emp_code" };
      if (!empId) return { emp_code: code, work_date: workDate, check_in: null, check_out: null, status, error: "Unknown employee" };
      if (!workDate) return { emp_code: code, work_date: "", check_in: null, check_out: null, status, error: "Missing date" };
      return {
        emp_code: code,
        work_date: workDate,
        check_in: r.check_in || r.in || null,
        check_out: r.check_out || r.out || null,
        status,
        employee_id: empId,
      };
    });
    setPreview(out);
    fire(`Parsed ${out.length} rows`);
  };

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
    setPreview([]);
  };

  const validCount = preview.filter((r) => r.employee_id && !r.error).length;
  const errCount = preview.filter((r) => r.error).length;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ background: "#eef5ff", borderColor: "#cfe1f7" }}>
        <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          <strong>Phase 6 — CSV attendance import.</strong> Expected columns:{" "}
          <span className="mono">emp_code, work_date, check_in, check_out, status</span>. Rows upsert
          into attendance with source = import.
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Paste CSV</h3>
          {can("manageEmp") && (
            <div className="row-flex">
              <button type="button" className="btn btn-sm" onClick={buildPreview} disabled={!raw.trim()}>
                Preview
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!validCount || importing}
                onClick={() => void importRows()}
              >
                {importing ? "Importing…" : `Import ${validCount} rows`}
              </button>
            </div>
          )}
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
                <tr key={`${r.emp_code}-${r.work_date}-${i}`}>
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
