import { useMemo } from "react";
import { useHrEmployees } from "../../hooks/useHrEmployees";
import { useHrShifts } from "../../hooks/useHrShifts";
import { useHrLeaveBalances } from "../../hooks/useHrRequests";
import { displayLeaveBalances, leaveBalanceRemaining } from "../../lib/leavePolicy";

const YEAR_OPTIONS = () => {
  const y = new Date().getFullYear();
  return [y, y - 1, y - 2];
};

export function LeaveSummaryPanel({
  employeeId,
  year,
  onEmployeeChange,
  onYearChange,
  showEmployeePicker = true,
}: {
  employeeId: string;
  year: number;
  onEmployeeChange: (id: string) => void;
  onYearChange: (y: number) => void;
  showEmployeePicker?: boolean;
}) {
  const { data: employees = [] } = useHrEmployees();
  const { data: shifts = [] } = useHrShifts();
  const { data: balances = [], isLoading } = useHrLeaveBalances(employeeId, year);

  const emp = employees.find((e) => e.id === employeeId);
  const shift = shifts.find((s) => s.id === emp?.shift_id);

  const rows = useMemo(
    () => displayLeaveBalances(balances, emp?.work_week, shift?.type),
    [balances, emp?.work_week, shift?.type],
  );

  return (
    <div className="card" style={{ padding: 0, overflow: "auto" }}>
      <div className="card-h" style={{ padding: "12px 16px" }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>Leave Summary</h3>
        <div className="row-flex" style={{ gap: 12 }}>
          {showEmployeePicker && (
            <label className="fld" style={{ minWidth: 200 }}>
              <span className="l">Employee</span>
              <select
                className="input"
                value={employeeId}
                onChange={(e) => onEmployeeChange(e.target.value)}
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name} ({e.emp_code})
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="fld" style={{ minWidth: 120 }}>
            <span className="l">Year</span>
            <select
              className="input"
              value={year}
              onChange={(e) => onYearChange(Number(e.target.value))}
            >
              {YEAR_OPTIONS().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {isLoading ? (
        <div className="empty" style={{ padding: 24 }}>Loading balances…</div>
      ) : !employeeId ? (
        <div className="empty" style={{ padding: 24 }}>Select an employee.</div>
      ) : (
        <table style={{ minWidth: 520 }}>
          <thead>
            <tr>
              <th>Leave Type</th>
              <th>Entitled</th>
              <th>Accrued</th>
              <th>Taken</th>
              <th>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.type}>
                <td className="strong">{b.type}</td>
                <td style={{ textAlign: "center" }}>{b.entitled}</td>
                <td style={{ textAlign: "center" }}>{b.accrued}</td>
                <td style={{ textAlign: "center" }}>{b.taken}</td>
                <td style={{ textAlign: "center", fontWeight: 600, color: "var(--moss)" }}>
                  {leaveBalanceRemaining(b)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!isLoading && employeeId && balances.length === 0 && (
        <div className="muted" style={{ padding: "8px 16px 16px", fontSize: 12 }}>
          No accrued balances for {year}. Run leave accrual from Configuration if needed.
        </div>
      )}
    </div>
  );
}
