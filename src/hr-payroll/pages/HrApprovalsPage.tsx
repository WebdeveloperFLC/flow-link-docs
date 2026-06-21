import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useHrAccess } from "../context/HrPayrollProvider";
import {
  useHrLeaveRequests,
  useHrCompoffRequests,
  useHrLateExemptions,
  useHrMispunchRequests,
} from "../hooks/useHrRequests";
import { HrSectionTabs } from "../components/ui/HrSectionTabs";
import { HR_APPROVAL_TABS } from "../lib/moduleStructure";
import { StatusBadge } from "../components/ui/StatusBadge";

const MODULE_ROUTES: Record<string, string> = {
  leave: "/hr/leave",
  late: "/hr/late",
  mispunch: "/hr/mispunch",
  compoff: "/hr/compoff",
  payroll: "/hr/payroll/verify",
};

export default function HrApprovalsPage() {
  const { type = "leave" } = useParams<{ type?: string }>();
  const navigate = useNavigate();
  const { can, pendingCounts, cycle } = useHrAccess();

  const { data: leaves = [] } = useHrLeaveRequests();
  const { data: compoff = [] } = useHrCompoffRequests();
  const { data: late = [] } = useHrLateExemptions();
  const { data: mispunch = [] } = useHrMispunchRequests();

  const tabs = HR_APPROVAL_TABS.map((t) => ({
    id: t.id,
    label: t.title,
    route: t.route,
    badge: t.pendingKey ? pendingCounts[t.pendingKey] : undefined,
  }));

  if (!HR_APPROVAL_TABS.some((t) => t.id === type)) {
    return <Navigate to="/hr/approvals/leave" replace />;
  }

  const items = useMemo(() => {
    if (type === "leave") {
      return leaves
        .filter((l) => l.status === "Pending")
        .map((l) => ({
          id: l.id,
          title: l.employees?.full_name ?? "Employee",
          sub: `${l.type} · ${l.from_date} → ${l.to_date ?? l.from_date} · ${l.days}d`,
          status: l.status,
        }));
    }
    if (type === "compoff") {
      return compoff
        .filter((c) => c.status === "Pending")
        .map((c) => ({
          id: c.id,
          title: c.employees?.full_name ?? "Employee",
          sub: c.occasion ?? "Comp-off request",
          status: c.status,
        }));
    }
    if (type === "late") {
      return late
        .filter((l) => l.status === "Pending")
        .map((l) => ({
          id: l.id,
          title: l.employees?.full_name ?? "Employee",
          sub: `${l.delay_min} min late · ${l.late_date}`,
          status: l.status,
        }));
    }
    if (type === "mispunch") {
      return mispunch
        .filter((m) => m.status === "Pending")
        .map((m) => ({
          id: m.id,
          title: m.employees?.full_name ?? "Employee",
          sub: `${m.issue} · ${m.punch_date}`,
          status: m.status,
        }));
    }
    if (type === "payroll") {
      const st = cycle?.status ?? "Draft";
      if (st === "Draft" || st === "Processed") {
        return [
          {
            id: "payroll-cycle",
            title: cycle?.label ?? "Current payroll cycle",
            sub: `Status: ${st} — verify and approve payroll`,
            status: "Pending" as const,
          },
        ];
      }
      return [];
    }
    return [];
  }, [type, leaves, compoff, late, mispunch, cycle]);

  const fullRoute = MODULE_ROUTES[type] ?? "/hr";

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ background: "var(--wash)", borderColor: "var(--line)" }}>
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
          Single approval inbox for managers and HR. Manager recommendation flows to HR final
          approval; only HR approval affects payroll snapshots.
        </div>
      </div>

      <HrSectionTabs tabs={tabs} basePath="/hr/approvals" />

      <div className="card">
        <div className="card-h">
          <h3>Pending — {HR_APPROVAL_TABS.find((t) => t.id === type)?.title}</h3>
          <Link to={fullRoute} className="btn btn-sm">
            Open full module →
          </Link>
        </div>

        {!can("approve") && type !== "payroll" && (
          <div className="empty" style={{ padding: 24 }}>
            Your role cannot approve requests. Switch to a role with Approve permission.
          </div>
        )}

        {items.length === 0 ? (
          <div className="empty">
            <div className="ico">✓</div>
            No pending items in this queue.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Employee / Item</th>
                <th>Details</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td className="strong">{row.title}</td>
                  <td className="muted" style={{ fontSize: 12.5 }}>
                    {row.sub}
                  </td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>
                    <button type="button" className="btn btn-sm" onClick={() => navigate(fullRoute)}>
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
