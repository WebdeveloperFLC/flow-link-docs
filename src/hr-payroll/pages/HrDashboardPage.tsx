import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
import { useHrPayrollLines } from "../hooks/useHrPayroll";
import {
  useHrLeaveRequests,
  useHrCompoffRequests,
  useHrLateExemptions,
  useHrMispunchRequests,
} from "../hooks/useHrRequests";
import { Stat } from "../components/ui/Stat";
import { inr, initials } from "../lib/format";
import type { PayrollLineRow } from "../lib/types";

const ROUTE_MAP: Record<string, string> = {
  leave: "/hr/leave",
  compoff: "/hr/compoff",
  late: "/hr/late",
  mispunch: "/hr/mispunch",
};

export default function HrDashboardPage() {
  const navigate = useNavigate();
  const { cycle } = useHrAccess();
  const { data: employees = [] } = useHrEmployees();
  const { data: lines = [], isLoading } = useHrPayrollLines(cycle?.id);
  const { data: leaves = [] } = useHrLeaveRequests();
  const { data: compoff = [] } = useHrCompoffRequests();
  const { data: late = [] } = useHrLateExemptions();
  const { data: mispunch = [] } = useHrMispunchRequests();

  const lineByEmp = useMemo(() => {
    const m = new Map<string, PayrollLineRow>();
    for (const l of lines) m.set(l.employee_id, l);
    return m;
  }, [lines]);

  const rows = useMemo(
    () =>
      employees.map((e) => {
        const l = lineByEmp.get(e.id);
        return {
          id: e.id,
          name: e.full_name,
          code: e.emp_code,
          branch: e.branches?.name ?? "—",
          monthly: e.monthly_gross,
          payable: l?.payable_days ?? 0,
          gross: l?.gross_earned ?? 0,
          pf: l?.pf_employee ?? 0,
          esic: l?.esic_employee ?? 0,
          net: l?.net_salary ?? 0,
          overridden: l?.is_overridden ?? false,
        };
      }),
    [employees, lineByEmp],
  );

  const liability = rows.reduce((s, r) => s + r.net, 0);
  const grossSum = rows.reduce((s, r) => s + r.gross, 0);
  const incentives = lines.reduce((s, l) => s + l.incentive, 0);
  const bonuses = lines.reduce((s, l) => s + l.bonus, 0);
  const deductions = rows.reduce((s, r) => s + r.pf + r.esic, 0);

  const branches = [...new Set(employees.map((e) => e.branches?.name ?? "Unknown"))];

  const queue = useMemo(
    () =>
      [
        ...leaves
          .filter((l) => l.status === "Pending")
          .map((l) => ({
            t: `Leave · ${l.employees?.full_name ?? "Employee"}`,
            s: l.type,
            k: "leave",
          })),
        ...compoff
          .filter((c) => c.status === "Pending")
          .map((c) => ({
            t: `Comp-off · ${c.employees?.full_name ?? "Employee"}`,
            s: c.occasion ?? "Request",
            k: "compoff",
          })),
        ...late
          .filter((l) => l.status === "Pending")
          .map((l) => ({
            t: `Late · ${l.employees?.full_name ?? "Employee"}`,
            s: `${l.delay_min}m`,
            k: "late",
          })),
        ...mispunch
          .filter((m) => m.status === "Pending")
          .map((m) => ({
            t: `Mispunch · ${m.employees?.full_name ?? "Employee"}`,
            s: m.issue,
            k: "mispunch",
          })),
      ].slice(0, 6),
    [leaves, compoff, late, mispunch],
  );

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="grid g6">
        <Stat lab="Employees" val={employees.length} meta="active" color="var(--moss)" />
        <Stat lab="Net Payroll" val={inr(liability)} meta="payable · live" color="var(--sky)" />
        <Stat lab="Gross" val={inr(grossSum)} meta="before stat." color="var(--moss-deep)" />
        <Stat lab="Deductions" val={inr(deductions)} meta="PF + ESIC" color="var(--clay)" />
        <Stat lab="Incentives" val={inr(incentives)} meta="this cycle" color="var(--gold)" />
        <Stat lab="Pending" val={queue.length} meta="approvals" color="var(--rose)" />
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="card-h">
            <h3>Net liability by branch</h3>
            <span className="tag">live</span>
          </div>
          {branches.map((b, i) => {
            const v = rows.filter((r) => r.branch === b).reduce((s, r) => s + r.net, 0);
            const max = Math.max(
              1,
              ...branches.map((bb) => rows.filter((r) => r.branch === bb).reduce((s, r) => s + r.net, 0)),
            );
            return (
              <div className="bar-row" key={b}>
                <div className="nm">{b}</div>
                <div className="tr">
                  <i
                    style={{
                      width: `${(v / max) * 100}%`,
                      background: i % 2 ? "var(--sky)" : "var(--moss)",
                    }}
                  />
                </div>
                <div className="vv">{inr(v)}</div>
              </div>
            );
          })}
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Action queue</h3>
            <button type="button" className="btn btn-sm" onClick={() => navigate("/hr/payroll")}>
              Verify →
            </button>
          </div>
          {queue.length === 0 ? (
            <div className="empty">
              <div className="ico">✓</div>
              All caught up.
            </div>
          ) : (
            queue.map((q, i) => (
              <div
                key={`${q.k}-${i}`}
                className="row-flex"
                style={{
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: i < queue.length - 1 ? "1px solid #eef0f5" : "none",
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{q.t}</div>
                  <div style={{ fontSize: 12, color: "var(--mut)" }}>{q.s}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => navigate(ROUTE_MAP[q.k] ?? "/hr")}
                >
                  Review
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Salary register — live (Gross → Net)</h3>
          <button type="button" className="btn btn-sm" onClick={() => navigate("/hr/payroll")}>
            Full register →
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div className="empty">Loading register…</div>
          ) : (
            <table style={{ minWidth: 880 }}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Branch</th>
                  <th>Monthly</th>
                  <th>Payable</th>
                  <th>Gross</th>
                  <th>PF</th>
                  <th>ESIC</th>
                  <th>Net Salary</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="strong">
                      <div className="row-flex">
                        <div className="avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
                          {initials(r.name)}
                        </div>
                        <div>
                          {r.name}
                          {r.overridden && (
                            <span className="tag" style={{ marginLeft: 5, color: "var(--clay)" }}>
                              ovr
                            </span>
                          )}
                          <div className="muted mono" style={{ fontSize: 11 }}>
                            {r.code}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{r.branch}</td>
                    <td className="mono">{inr(r.monthly)}</td>
                    <td style={{ textAlign: "center", fontWeight: 600, color: "var(--moss)" }}>
                      {r.payable}
                    </td>
                    <td className="mono">{inr(r.gross)}</td>
                    <td className="mono" style={{ color: "var(--rose)" }}>
                      {inr(r.pf)}
                    </td>
                    <td className="mono" style={{ color: "var(--rose)" }}>
                      {inr(r.esic)}
                    </td>
                    <td className="mono strong">{inr(r.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
