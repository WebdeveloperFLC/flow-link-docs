import { useMemo } from "react";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrPayrollLines } from "../hooks/useHrPayroll";
import { inr, initials } from "../lib/format";
import {
  downloadPayrollRegister,
  linesToRegisterRows,
  printRegisterPdf,
  type PayrollRegisterRow,
} from "../lib/payrollExport";
import { fetchPayrollRegisterExport } from "../lib/hrApi";

export default function HrSalaryRegisterPage() {
  const { cycle, can, fire } = useHrAccess();
  const { data: lines = [], isLoading } = useHrPayrollLines(cycle?.id);

  const rows = useMemo(() => {
    if (!cycle) return [] as PayrollRegisterRow[];
    return linesToRegisterRows(lines, cycle.label, cycle.status);
  }, [lines, cycle]);

  const exportRegister = async (fmt: "CSV" | "Excel") => {
    if (!cycle?.id) return;
    try {
      const exported = await fetchPayrollRegisterExport(cycle.id);
      if (exported.length > 0) {
        downloadPayrollRegister(exported, cycle.label, fmt);
        fire(`${fmt} exported`);
        return;
      }
    } catch {
      /* fallback */
    }
    downloadPayrollRegister(rows, cycle.label, fmt);
    fire(`${fmt} exported`);
  };

  const exportPdf = () => {
    if (!cycle) return;
    printRegisterPdf(
      rows,
      cycle.label,
      cycle.status === "Locked" || cycle.status === "Paid",
    );
    fire("Print dialog opened");
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ background: "var(--wash)", borderColor: "var(--line)" }}>
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
          Salary register for cycle <strong>{cycle?.label ?? "—"}</strong>. Uses payroll snapshots after
          processing — export to CSV, Excel, or PDF.
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Salary Register</h3>
          {can("export") && (
            <div className="row-flex" style={{ gap: 8 }}>
              <button type="button" className="btn btn-sm" onClick={() => void exportRegister("CSV")}>
                CSV
              </button>
              <button type="button" className="btn btn-sm" onClick={() => void exportRegister("Excel")}>
                Excel
              </button>
              <button type="button" className="btn btn-sm" onClick={exportPdf}>
                PDF / Print
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="empty">Loading register…</div>
        ) : rows.length === 0 ? (
          <div className="empty">
            <div className="ico">▥</div>
            No payroll lines — run Payroll Processing first.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ minWidth: 880 }}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Branch</th>
                  <th>Payable</th>
                  <th>Gross</th>
                  <th>PF</th>
                  <th>ESIC</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.emp_code}>
                    <td className="strong">
                      <div className="row-flex">
                        <div className="avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
                          {initials(r.full_name)}
                        </div>
                        <div>
                          {r.full_name}
                          <div className="muted mono" style={{ fontSize: 11 }}>
                            {r.emp_code}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{r.branch_name ?? "—"}</td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{r.payable_days}</td>
                    <td className="mono">{inr(r.gross_earned)}</td>
                    <td className="mono">{inr(r.pf_employee)}</td>
                    <td className="mono">{inr(r.esic_employee)}</td>
                    <td className="mono strong">{inr(r.net_salary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
