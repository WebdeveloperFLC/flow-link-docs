import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
import { useHrPayrollLines } from "../hooks/useHrPayroll";
import { useHrDashboardStats } from "../hooks/useHrDashboardStats";
import {
  useHrLeaveRequests,
  useHrCompoffRequests,
  useHrLateExemptions,
  useHrMispunchRequests,
} from "../hooks/useHrRequests";
import { Stat } from "../components/ui/Stat";
import { inr, initials } from "../lib/format";
import { totalPendingApprovals } from "../lib/nav";
import type { PayrollLineRow } from "../lib/types";

const APPROVAL_ROUTES: Record<string, string> = {
  leave: "/hr/approvals/leave",
  compoff: "/hr/approvals/compoff",
  late: "/hr/approvals/late",
  mispunch: "/hr/approvals/mispunch",
};

export default function HrDashboardPage() {
  const navigate = useNavigate();
  const { cycle, pendingCounts } = useHrAccess();
  const { data: employees = [] } = useHrEmployees();
  const { data: lines = [], isLoading } = useHrPayrollLines(cycle?.id);
  const { data: stats } = useHrDashboardStats();
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
          net: l?.net_salary ?? 0,
        };
      }),
    [employees, lineByEmp],
  );

  const liability = rows.reduce((s, r) => s + r.net, 0);
  const pendingTotal = totalPendingApprovals(pendingCounts);

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
      ].slice(0, 8),
    [leaves, compoff, late, mispunch],
  );

  const payrollStatus = cycle?.status ?? "No cycle";
  const payrollMeta = cycle ? `${cycle.payroll_days} days · ${cycle.label}` : "Configure cycle";

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="grid g6">
        <Stat lab="Total Employees" val={stats?.totalEmployees ?? employees.length} meta="active" color="var(--moss)" />
        <Stat lab="Present Today" val={stats?.presentToday ?? "—"} meta="checked in" color="var(--good)" />
        <Stat lab="Absent Today" val={stats?.absentToday ?? "—"} meta="no show" color="var(--rose)" />
        <Stat lab="On Leave" val={stats?.onLeaveToday ?? "—"} meta="approved today" color="var(--sky)" />
        <Stat lab="Late Arrivals" val={stats?.lateToday ?? "—"} meta="today" color="var(--clay)" />
        <Stat lab="Mispunches" val={stats?.mispunchToday ?? "—"} meta="pending today" color="var(--gold)" />
      </div>

      <div className="grid g4">
        <Stat lab="Payroll Status" val={payrollStatus} meta={payrollMeta} color="var(--moss-deep)" />
        <Stat lab="Pending Approvals" val={pendingTotal} meta="all queues" color="var(--rose)" />
        <Stat lab="Net Payroll" val={inr(liability)} meta="current cycle" color="var(--sky)" />
        <Stat
          lab="HR Alerts"
          val={queue.length}
          meta="action items"
          color="var(--clay)"
        />
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="card-h">
            <h3>Upcoming birthdays</h3>
            <Link to="/hr/employees" className="btn btn-sm">
              Employees →
            </Link>
          </div>
          {(stats?.upcomingBirthdays ?? []).length === 0 ? (
            <div className="empty" style={{ padding: 16 }}>
              None in the next 30 days.
            </div>
          ) : (
            stats!.upcomingBirthdays.map((e) => (
              <div key={e.full_name} className="row-flex" style={{ padding: "6px 0", fontSize: 13.5 }}>
                <span>{e.full_name}</span>
                <span className="muted mono" style={{ marginLeft: "auto", fontSize: 12 }}>
                  {e.date_of_birth?.slice(5, 10)}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Upcoming work anniversaries</h3>
            <Link to="/hr/employees" className="btn btn-sm">
              Employees →
            </Link>
          </div>
          {(stats?.upcomingAnniversaries ?? []).length === 0 ? (
            <div className="empty" style={{ padding: 16 }}>
              None in the next 30 days.
            </div>
          ) : (
            stats!.upcomingAnniversaries.map((e) => (
              <div key={e.full_name} className="row-flex" style={{ padding: "6px 0", fontSize: 13.5 }}>
                <span>{e.full_name}</span>
                <span className="muted mono" style={{ marginLeft: "auto", fontSize: 12 }}>
                  {e.date_of_joining?.slice(5, 10)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="card-h">
            <h3>Approval Center</h3>
            <button type="button" className="btn btn-sm" onClick={() => navigate("/hr/approvals")}>
              Open inbox →
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
                  onClick={() => navigate(APPROVAL_ROUTES[q.k] ?? "/hr/approvals")}
                >
                  Review
                </button>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Payroll quick links</h3>
          </div>
          <div className="grid" style={{ gap: 8 }}>
            <button type="button" className="btn" onClick={() => navigate("/hr/config/payroll-cycle")}>
              Payroll Cycle Management
            </button>
            <button type="button" className="btn" onClick={() => navigate("/hr/payroll/process")}>
              Payroll Processing
            </button>
            <button type="button" className="btn" onClick={() => navigate("/hr/payroll/verify")}>
              Payroll Verification
            </button>
            <button type="button" className="btn" onClick={() => navigate("/hr/payroll/register")}>
              Salary Register
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Salary snapshot — top net pay</h3>
          <button type="button" className="btn btn-sm" onClick={() => navigate("/hr/payroll/register")}>
            Full register →
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div className="empty">Loading register…</div>
          ) : (
            <table style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Branch</th>
                  <th>Net Salary</th>
                </tr>
              </thead>
              <tbody>
                {[...rows]
                  .sort((a, b) => b.net - a.net)
                  .slice(0, 8)
                  .map((r) => (
                    <tr key={r.id}>
                      <td className="strong">
                        <div className="row-flex">
                          <div className="avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
                            {initials(r.name)}
                          </div>
                          <div>
                            {r.name}
                            <div className="muted mono" style={{ fontSize: 11 }}>
                              {r.code}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{r.branch}</td>
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
