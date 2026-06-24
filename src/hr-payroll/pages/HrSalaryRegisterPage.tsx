import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrPayrollLines } from "../hooks/useHrPayroll";
import { employeeCurrency, formatMoney, initials } from "../lib/format";
import {
  buildBankTransferRows,
  confirmBankTransferExport,
  bankTransferValidation,
  downloadBankTransferCsv,
  formatBankTransferSummary,
} from "../lib/bankTransferExport";
import {
  downloadPayrollRegister,
  linesToRegisterRows,
  mergeRegisterExportWithClientPt,
  printRegisterPdf,
  type PayrollRegisterRow,
} from "../lib/payrollExport";
import { fetchPayrollRegisterExport } from "../lib/hrApi";
import { PayrollWorkflowStepper } from "../components/payroll/PayrollBreakdownPanel";

export default function HrSalaryRegisterPage() {
  const { cycle, can, fire } = useHrAccess();
  const { data: lines = [], isLoading } = useHrPayrollLines(cycle?.id);

  const rows = useMemo(() => {
    if (!cycle) return [] as PayrollRegisterRow[];
    return linesToRegisterRows(lines, cycle.label, cycle.status);
  }, [lines, cycle]);

  const hasCanada = lines.some(
    (l) => l.employees?.payroll_country === "CA" || l.employees?.salary_currency === "CAD",
  );
  const dedLabels = hasCanada
    ? { pf: "CPP", esic: "EI", pt: "Tax+" }
    : { pf: "PF", esic: "ESIC", pt: "PT" };

  const exportRegister = async (fmt: "CSV" | "Excel") => {
    if (!cycle?.id || !rows.length) {
      fire("No payroll lines to export");
      return;
    }
    try {
      const exported = await fetchPayrollRegisterExport(cycle.id);
      if (exported.length > 0) {
        downloadPayrollRegister(mergeRegisterExportWithClientPt(exported, rows), cycle.label, fmt);
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

  const exportBank = () => {
    if (!cycle || !lines.length) return;
    const bankRows = buildBankTransferRows(lines);
    const { totalNet } = bankTransferValidation(bankRows);
    if (!confirmBankTransferExport(bankRows)) return;
    downloadBankTransferCsv(bankRows, cycle.label);
    fire(`Bank file exported · ${formatBankTransferSummary(totalNet)}`);
  };

  const rowMoney = (line: (typeof lines)[0], n: number) =>
    formatMoney(n, employeeCurrency(line.employees));

  return (
    <div className="page-grid">
      <div className="card card-wash">
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
          Salary register for cycle <strong>{cycle?.label ?? "—"}</strong>. Review after{" "}
          <Link to="/hr/payroll/verify">Payroll Verification</Link> — process, approve, and lock
          before disbursement. Export register or bank transfer file when locked.
        </div>
      </div>

      {cycle && (
        <div className="card" style={{ padding: 16 }}>
          <PayrollWorkflowStepper status={cycle.status} />
        </div>
      )}

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
              <button type="button" className="btn btn-sm" onClick={exportBank}>
                Bank Transfer CSV
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="empty">Loading register…</div>
        ) : rows.length === 0 ? (
          <div className="empty">
            <div className="ico">▥</div>
            No payroll lines — rebuild register on{" "}
            <Link to="/hr/payroll/verify">Payroll Verification</Link>.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ minWidth: 1100 }}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Branch</th>
                  <th>Payable</th>
                  <th>Gross</th>
                  <th>{dedLabels.pf}</th>
                  <th>{dedLabels.esic}</th>
                  <th>{dedLabels.pt}</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const r = rows.find((x) => x.emp_code === line.employees?.emp_code);
                  if (!r) return null;
                  return (
                    <tr key={line.id}>
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
                      <td className="mono">{rowMoney(line, r.gross_earned)}</td>
                      <td className="mono">{rowMoney(line, r.pf_employee)}</td>
                      <td className="mono">{rowMoney(line, r.esic_employee)}</td>
                      <td className="mono">{rowMoney(line, r.pt_employee ?? 0)}</td>
                      <td className="mono strong">{rowMoney(line, r.net_salary)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
