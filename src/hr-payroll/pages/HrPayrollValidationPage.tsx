import { useMemo, useState } from "react";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrAttendanceBulk } from "../hooks/useHrAttendanceBulk";
import { useEstimatedPayrollBatch } from "../hooks/useEstimatedPayroll";
import { fmtDur } from "../lib/attendanceMetrics";
import {
  computeEstimatedPayroll,
  type EstimatedPayrollResult,
} from "../lib/estimatedPayrollCalculator";
import { formatMoney } from "../lib/format";
import type { AttendanceRow, EmployeeRow } from "../lib/types";

type ValidationRow = EstimatedPayrollResult & {
  employee: EmployeeRow;
};

export default function HrPayrollValidationPage() {
  const { cycle } = useHrAccess();
  const { activeEmployees, shifts, holidays, otPolicy } = useEstimatedPayrollBatch(cycle);
  const employeeIds = useMemo(() => activeEmployees.map((e) => e.id), [activeEmployees]);
  const { data: attendance = [], isLoading } = useHrAttendanceBulk(
    cycle?.start_date,
    cycle?.end_date,
    employeeIds,
  );
  const [search, setSearch] = useState("");
  const [manualByEmployee, setManualByEmployee] = useState<Record<string, string>>({});

  const attendanceByEmployee = useMemo(() => {
    const map = new Map<string, AttendanceRow[]>();
    for (const row of attendance) {
      const list = map.get(row.employee_id) ?? [];
      list.push(row);
      map.set(row.employee_id, list);
    }
    return map;
  }, [attendance]);

  const rows = useMemo((): ValidationRow[] => {
    if (!cycle) return [];
    return activeEmployees
      .map((emp) => {
        const shift = shifts.find((s) => s.id === emp.shift_id) ?? shifts[0];
        if (!shift) return null;
        const estimate = computeEstimatedPayroll({
          employee: emp,
          shift,
          cycle,
          attendance: attendanceByEmployee.get(emp.id) ?? [],
          holidays,
          otPolicy,
        });
        return { ...estimate, employee: emp };
      })
      .filter((r): r is ValidationRow => r != null);
  }, [activeEmployees, shifts, cycle, attendanceByEmployee, holidays, otPolicy]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.employee.full_name.toLowerCase().includes(q) ||
        r.employee.emp_code.toLowerCase().includes(q),
    );
  }, [rows, search]);

  if (!cycle) {
    return (
      <div className="page-grid">
        <div className="card empty">Configure a payroll cycle before using payroll validation.</div>
      </div>
    );
  }

  const money = (n: number, emp: EmployeeRow) =>
    formatMoney(n, emp.companies?.currency ?? emp.salary_currency ?? "INR");

  const setManual = (employeeId: string, value: string) => {
    setManualByEmployee((prev) => ({ ...prev, [employeeId]: value }));
  };

  return (
    <div className="page-grid">
      <div className="card card-wash">
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
          <strong>Payroll validation</strong> — live estimated earnings for{" "}
          <strong>{cycle.label}</strong> ({cycle.start_date} → {cycle.end_date}). Attendance
          status columns explain how gross was built. Enter a manual amount to compare during UAT.
          Does not generate, lock, or post payroll.
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Current cycle estimates</h3>
          <div className="row-flex" style={{ gap: 10 }}>
            <input
              className="input"
              placeholder="Search employee…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 220 }}
            />
            <span className="tag">{filtered.length} employees</span>
          </div>
        </div>

        {isLoading ? (
          <div className="empty">Loading attendance…</div>
        ) : (
          <div className="table-wrap" style={{ overflowX: "auto" }}>
            <table className="datatable compact">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Basis</th>
                  <th style={{ textAlign: "right" }}>Monthly salary</th>
                  <th style={{ textAlign: "center" }}>Working days</th>
                  <th style={{ textAlign: "right" }}>Daily rate</th>
                  <th style={{ textAlign: "center" }} title="Present / Late">Present</th>
                  <th style={{ textAlign: "center" }}>Half</th>
                  <th style={{ textAlign: "center" }}>Holiday</th>
                  <th style={{ textAlign: "center" }}>Paid leave</th>
                  <th style={{ textAlign: "center" }}>Unpaid</th>
                  <th style={{ textAlign: "center" }}>Absent</th>
                  <th style={{ textAlign: "center" }}>Worked hrs</th>
                  <th style={{ textAlign: "center" }}>OT</th>
                  <th style={{ textAlign: "right" }}>Est. gross</th>
                  <th style={{ textAlign: "right" }}>Manual</th>
                  <th style={{ textAlign: "right" }}>Diff</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const b = r.attendanceBreakdown;
                  const manualRaw = manualByEmployee[r.employee.id] ?? "";
                  const manualNum = manualRaw === "" ? null : parseFloat(manualRaw);
                  const diff =
                    manualNum != null && !Number.isNaN(manualNum)
                      ? round2(manualNum - r.estimatedGross)
                      : null;

                  return (
                    <tr key={r.employee.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.employee.full_name}</div>
                        <div className="muted mono" style={{ fontSize: 11 }}>
                          {r.employee.emp_code}
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>{r.payBasis}</td>
                      <td className="mono" style={{ textAlign: "right" }}>
                        {money(r.monthlyGross, r.employee)}
                      </td>
                      <td style={{ textAlign: "center" }}>{r.workingDays}</td>
                      <td className="mono" style={{ textAlign: "right" }}>
                        {money(r.dailyRate, r.employee)}
                      </td>
                      <td style={{ textAlign: "center" }}>{b.present}</td>
                      <td style={{ textAlign: "center" }}>{b.halfDay}</td>
                      <td style={{ textAlign: "center" }}>{b.holiday}</td>
                      <td style={{ textAlign: "center" }}>{b.paidLeave}</td>
                      <td style={{ textAlign: "center" }}>{b.unpaidLeave}</td>
                      <td style={{ textAlign: "center" }}>{b.absent}</td>
                      <td style={{ textAlign: "center" }}>{r.workedHours.toFixed(1)}</td>
                      <td style={{ textAlign: "center", fontSize: 12 }}>
                        {fmtDur(r.otMinutes)}
                        {!r.otDisplayOnly && r.otPay != null && (
                          <div className="muted">{money(r.otPay, r.employee)}</div>
                        )}
                      </td>
                      <td className="mono strong" style={{ textAlign: "right", color: "var(--moss-deep)" }}>
                        {money(r.estimatedGross, r.employee)}
                      </td>
                      <td style={{ textAlign: "right", minWidth: 88 }}>
                        <input
                          className="input mono"
                          type="number"
                          step="0.01"
                          placeholder="—"
                          value={manualRaw}
                          onChange={(e) => setManual(r.employee.id, e.target.value)}
                          style={{ width: 88, padding: "4px 6px", fontSize: 12 }}
                        />
                      </td>
                      <td
                        className="mono"
                        style={{
                          textAlign: "right",
                          color:
                            diff == null
                              ? "inherit"
                              : Math.abs(diff) < 1
                                ? "var(--good)"
                                : "var(--rose)",
                        }}
                      >
                        {diff == null ? "—" : money(diff, r.employee)}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={16} className="empty">
                      No employees match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="ess-estimate-disclaimer" style={{ marginTop: 14 }}>
          Estimated earnings only. Final payroll is subject to HR approval.
        </p>
      </div>
    </div>
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
