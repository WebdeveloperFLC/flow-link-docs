import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import {
  useHrLeaveRequests,
  useHrCompoffRequests,
  useHrLateExemptions,
  useHrMispunchRequests,
  useHrTrainingRecords,
  useHrApprovals,
} from "../hooks/useHrRequests";
import { Stat } from "../components/ui/Stat";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ApprovalTrail } from "../components/ui/ApprovalTrail";
import { ModalShell } from "../components/ui/ModalShell";
import {
  approvePayrollCycle,
  hrAudit,
  processApprovalDecision,
  processPayrollCycle,
  rebuildPayrollLine,
} from "../lib/hrApi";
import { decideTrainingCompletion } from "../lib/trainingWorkflow";
import type {
  CompoffRequestRow,
  LateExemptionRow,
  LeaveRequestRow,
  MispunchRequestRow,
  TrainingRecordRow,
} from "../lib/types";
import { TrainingDetailModal } from "../components/training/TrainingDetailModal";
import { canBypassTrainingApproval } from "../lib/trainingWorkflow";

type CategoryId =
  | "leave"
  | "compoff"
  | "late"
  | "mispunch"
  | "training"
  | "payroll";

const CATEGORIES: { id: CategoryId; title: string; pendingKey?: string; tone: "blue" | "green" | "orange" | "pink" | "purple" | "gold" }[] = [
  { id: "leave", title: "Leave Approvals", pendingKey: "leave", tone: "blue" },
  { id: "compoff", title: "Comp-Off Approvals", pendingKey: "compoff", tone: "green" },
  { id: "late", title: "Late Requests", pendingKey: "late", tone: "orange" },
  { id: "mispunch", title: "Mispunch Requests", pendingKey: "mispunch", tone: "pink" },
  { id: "training", title: "Training Requests", pendingKey: "training", tone: "purple" },
  { id: "payroll", title: "Payroll Approvals", tone: "gold" },
];

type QueueRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  details: string;
  status: string;
  category: CategoryId;
  leave?: LeaveRequestRow;
  compoff?: CompoffRequestRow;
  late?: LateExemptionRow;
  mispunch?: MispunchRequestRow;
  training?: TrainingRecordRow;
  payrollCycle?: boolean;
};

function Employee360Link({ employeeId, name }: { employeeId: string; name: string }) {
  return (
    <a
      href={`/hr/employee/${employeeId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="strong attendance-emp-link"
      onClick={(e) => e.stopPropagation()}
    >
      {name}
    </a>
  );
}

export default function HrApprovalsPage() {
  const { type } = useParams<{ type?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { can, fire, pendingCounts, cycle, assignedRole } = useHrAccess();

  const selected: CategoryId =
    CATEGORIES.some((c) => c.id === type) ? (type as CategoryId) : "leave";

  const { data: leaves = [] } = useHrLeaveRequests();
  const { data: compoff = [] } = useHrCompoffRequests();
  const { data: late = [] } = useHrLateExemptions();
  const { data: mispunch = [] } = useHrMispunchRequests();
  const { data: training = [] } = useHrTrainingRecords();

  const payrollPending =
    cycle?.status === "Draft" || cycle?.status === "Processed" ? 1 : 0;

  const counts = useMemo(
    () => ({
      leave: pendingCounts.leave ?? 0,
      compoff: pendingCounts.compoff ?? 0,
      late: pendingCounts.late ?? 0,
      mispunch: pendingCounts.mispunch ?? 0,
      training: pendingCounts.training ?? 0,
      payroll: payrollPending,
    }),
    [pendingCounts, payrollPending],
  );

  const pendingLeaves = useMemo(
    () => leaves.filter((l) => l.status === "Pending"),
    [leaves],
  );
  const pendingCompoff = useMemo(
    () => compoff.filter((c) => c.status === "Pending"),
    [compoff],
  );
  const pendingLate = useMemo(
    () => late.filter((l) => l.status === "Pending"),
    [late],
  );
  const pendingMispunch = useMemo(
    () => mispunch.filter((m) => m.status === "Pending"),
    [mispunch],
  );
  const pendingTraining = useMemo(
    () =>
      training.filter(
        (t) =>
          t.status === "Pending Manager Approval" || t.status === "Pending HR Approval",
      ),
    [training],
  );

  const leaveIds = pendingLeaves.map((l) => l.id);
  const { data: leaveApprovals = [] } = useHrApprovals("leave", leaveIds);

  const [viewRow, setViewRow] = useState<QueueRow | null>(null);
  const [rejectRow, setRejectRow] = useState<QueueRow | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [acting, setActing] = useState(false);

  const invalidateAll = async () => {
    await qc.invalidateQueries({ queryKey: ["hr-leaves"] });
    await qc.invalidateQueries({ queryKey: ["hr-compoff"] });
    await qc.invalidateQueries({ queryKey: ["hr-late"] });
    await qc.invalidateQueries({ queryKey: ["hr-mispunch"] });
    await qc.invalidateQueries({ queryKey: ["hr-training"] });
    await qc.invalidateQueries({ queryKey: ["hr-pending-counts"] });
    await qc.invalidateQueries({ queryKey: ["hr-approvals"] });
    await qc.invalidateQueries({ queryKey: ["hr-payroll-lines"] });
    await qc.invalidateQueries({ queryKey: ["hr-cycles"] });
  };

  const rows = useMemo<QueueRow[]>(() => {
    if (selected === "leave") {
      return pendingLeaves.map((l) => ({
        id: l.id,
        employeeId: l.employee_id,
        employeeName: l.employees?.full_name ?? "Employee",
        details: `${l.type} · ${l.from_date} → ${l.to_date} · ${l.days}d`,
        status: l.status,
        category: "leave",
        leave: l,
      }));
    }
    if (selected === "compoff") {
      return pendingCompoff.map((c) => ({
        id: c.id,
        employeeId: c.employee_id,
        employeeName: c.employees?.full_name ?? "Employee",
        details: `${c.occasion ?? "Comp-off"} · worked ${c.worked_date}`,
        status: c.status,
        category: "compoff",
        compoff: c,
      }));
    }
    if (selected === "late") {
      return pendingLate.map((l) => ({
        id: l.id,
        employeeId: l.employee_id,
        employeeName: l.employees?.full_name ?? "Employee",
        details: `${l.delay_min} min late · ${l.late_date}`,
        status: l.status,
        category: "late",
        late: l,
      }));
    }
    if (selected === "mispunch") {
      return pendingMispunch.map((m) => ({
        id: m.id,
        employeeId: m.employee_id,
        employeeName: m.employees?.full_name ?? "Employee",
        details: `${m.issue} · ${m.punch_date}`,
        status: m.status,
        category: "mispunch",
        mispunch: m,
      }));
    }
    if (selected === "training") {
      return pendingTraining.map((t) => ({
        id: t.id,
        employeeId: t.employee_id,
        employeeName: t.employees?.full_name ?? "Employee",
        details: `${t.type} · ${t.status}`,
        status: t.status,
        category: "training",
        training: t,
      }));
    }
    if (selected === "payroll" && payrollPending && cycle) {
      return [
        {
          id: cycle.id,
          employeeId: "",
          employeeName: cycle.label,
          details: `Status: ${cycle.status} — verify and approve payroll cycle`,
          status: "Pending",
          category: "payroll",
          payrollCycle: true,
        },
      ];
    }
    return [];
  }, [
    selected,
    pendingLeaves,
    pendingCompoff,
    pendingLate,
    pendingMispunch,
    pendingTraining,
    payrollPending,
    cycle,
  ]);

  const approveEntity = async (row: QueueRow, comment?: string) => {
    setActing(true);
    try {
      if (row.category === "leave" && row.leave) {
        const result = (await processApprovalDecision("leave", row.id, "Approved", comment)) as {
          status?: string;
        } | null;
        if (result?.status === "Approved" && cycle?.id) {
          await rebuildPayrollLine(row.leave.employee_id, cycle.id);
        }
        await hrAudit("Leave Approved", row.employeeName);
        fire(result?.status === "Pending" ? "Stage approved — awaiting next approver" : "Leave approved");
      } else if (row.category === "compoff" && row.compoff) {
        const result = (await processApprovalDecision("compoff", row.id, "Approved", comment)) as {
          status?: string;
        } | null;
        if (result?.status === "Approved" && cycle?.id) {
          await rebuildPayrollLine(row.compoff.employee_id, cycle.id);
        }
        await hrAudit("Comp-off Approved", row.employeeName);
        fire("Comp-off approved");
      } else if (row.category === "late" && row.late) {
        const result = (await processApprovalDecision("late", row.id, "Approved", comment)) as {
          status?: string;
        } | null;
        if (result?.status === "Approved" && cycle?.id) {
          await rebuildPayrollLine(row.late.employee_id, cycle.id);
        }
        await hrAudit("Late Approved", row.employeeName);
        fire("Late exemption approved");
      } else if (row.category === "mispunch" && row.mispunch) {
        const result = (await processApprovalDecision("mispunch", row.id, "Approved", comment)) as {
          status?: string;
        } | null;
        if (result?.status === "Approved" && cycle?.id) {
          await rebuildPayrollLine(row.mispunch.employee_id, cycle.id);
        }
        await hrAudit("Mispunch Approved", row.employeeName);
        fire("Mispunch approved");
      } else if (row.category === "training" && row.training) {
        await decideTrainingCompletion(row.training, "Approved");
        fire("Training approval recorded");
      } else if (row.category === "payroll" && cycle) {
        if (cycle.status === "Draft") {
          await processPayrollCycle(cycle.id);
          fire("Payroll processed");
        } else if (cycle.status === "Processed") {
          await approvePayrollCycle(cycle.id);
          fire("Payroll cycle approved");
        }
      }
      setViewRow(null);
      await invalidateAll();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setActing(false);
    }
  };

  const rejectEntity = async () => {
    if (!rejectRow) return;
    setActing(true);
    try {
      const comment = rejectComment.trim() || undefined;
      if (rejectRow.category === "leave" && rejectRow.leave) {
        await processApprovalDecision("leave", rejectRow.id, "Rejected", comment);
        if (comment) {
          await supabase
            .from("leave_requests" as never)
            .update({ rejection_reason: comment } as never)
            .eq("id", rejectRow.id);
        }
        fire("Leave rejected");
      } else if (rejectRow.category === "compoff" && rejectRow.compoff) {
        await processApprovalDecision("compoff", rejectRow.id, "Rejected", comment);
        fire("Comp-off rejected");
      } else if (rejectRow.category === "late" && rejectRow.late) {
        await processApprovalDecision("late", rejectRow.id, "Rejected", comment);
        fire("Late exemption rejected");
      } else if (rejectRow.category === "mispunch" && rejectRow.mispunch) {
        await processApprovalDecision("mispunch", rejectRow.id, "Rejected", comment);
        fire("Mispunch rejected");
      } else if (rejectRow.category === "training" && rejectRow.training) {
        await decideTrainingCompletion(rejectRow.training, "Rejected");
        fire("Training rejected");
      }
      setRejectRow(null);
      setRejectComment("");
      setViewRow(null);
      await invalidateAll();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Rejection failed");
    } finally {
      setActing(false);
    }
  };

  const canApprove = can("approve");
  const adminBypass = canBypassTrainingApproval(assignedRole);

  return (
    <div className="page-grid">
      <div className="card card-wash">
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
          Single approval inbox for HR and managers. Review, approve, or reject requests here — no need
          to open separate modules. Employee names open Employee 360 in a new tab.
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        {CATEGORIES.map((c) => {
          const count = counts[c.id];
          const active = selected === c.id;
          return (
            <button
              key={c.id}
              type="button"
              className={`approval-category-card${active ? " approval-category-card-active" : ""}`}
              onClick={() => navigate(`/hr/approvals/${c.id}`)}
            >
              <Stat
                lab={c.title}
                val={count}
                variant="metric"
                tone={c.tone}
                meta={active ? "Selected" : "Pending"}
              />
            </button>
          );
        })}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="card-h" style={{ padding: "14px 16px" }}>
          <h3 style={{ fontSize: 15 }}>
            {CATEGORIES.find((c) => c.id === selected)?.title ?? "Pending"}
          </h3>
          <span className="tag">{rows.length} pending</span>
        </div>

        {!canApprove && selected !== "payroll" && (
          <div className="empty" style={{ padding: 20 }}>
            Your role cannot approve requests. Switch to a role with Approve permission to act here.
          </div>
        )}

        {rows.length === 0 ? (
          <div className="empty">
            <div className="ico">✓</div>
            No pending items in this queue.
          </div>
        ) : (
          <table style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Details</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.employeeId ? (
                      <Employee360Link employeeId={row.employeeId} name={row.employeeName} />
                    ) : (
                      <span className="strong">{row.employeeName}</span>
                    )}
                  </td>
                  <td className="muted" style={{ fontSize: 12.5 }}>{row.details}</td>
                  <td><StatusBadge status={row.status} /></td>
                  <td>
                    <div className="row-flex" style={{ gap: 6, flexWrap: "wrap" }}>
                      <button type="button" className="btn btn-sm" onClick={() => setViewRow(row)}>
                        View
                      </button>
                      {canApprove && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-good"
                            disabled={acting}
                            onClick={() => void approveEntity(row)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-bad"
                            disabled={acting}
                            onClick={() => {
                              setRejectRow(row);
                              setRejectComment("");
                            }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {selected === "payroll" && (
                        <a
                          href="/hr/payroll/verify"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm"
                        >
                          Open verify
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {viewRow?.category === "leave" && viewRow.leave && (
        <ModalShell
          title="Leave request"
          onClose={() => setViewRow(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setViewRow(null)}>Close</button>
              {viewRow.employeeId && (
                <a
                  href={`/hr/employee/${viewRow.employeeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                >
                  Employee 360 ↗
                </a>
              )}
              {canApprove && (
                <>
                  <button
                    type="button"
                    className="btn btn-good"
                    disabled={acting}
                    onClick={() => void approveEntity(viewRow)}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn-bad"
                    onClick={() => {
                      setRejectRow(viewRow);
                      setRejectComment("");
                    }}
                  >
                    Reject
                  </button>
                </>
              )}
            </>
          }
        >
          <p><strong>Type:</strong> {viewRow.leave.type}</p>
          <p><strong>Dates:</strong> {viewRow.leave.from_date} → {viewRow.leave.to_date}</p>
          <p><strong>Days:</strong> {viewRow.leave.days}</p>
          <p><strong>Reason:</strong> {viewRow.leave.reason ?? "—"}</p>
          <ApprovalTrail entityId={viewRow.id} approvals={leaveApprovals} />
        </ModalShell>
      )}

      {viewRow?.category === "training" && viewRow.training && (
        <TrainingDetailModal
          row={viewRow.training}
          canManage={canApprove}
          adminBypass={adminBypass}
          onClose={() => setViewRow(null)}
          onExtend={() => setViewRow(null)}
          onComplete={() => setViewRow(null)}
          onRefresh={() => void invalidateAll()}
          onNotify={fire}
          onDelete={() => {
            setViewRow(null);
            void invalidateAll();
          }}
        />
      )}

      {viewRow &&
        viewRow.category !== "leave" &&
        viewRow.category !== "training" && (
          <ModalShell
            title="Request details"
            onClose={() => setViewRow(null)}
            footer={
              <button type="button" className="btn" onClick={() => setViewRow(null)}>Close</button>
            }
          >
            <p className="muted" style={{ fontSize: 13 }}>{viewRow.details}</p>
            {viewRow.employeeId && (
              <Link to={`/hr/employee/${viewRow.employeeId}`} target="_blank" className="btn btn-sm">
                Employee 360 ↗
              </Link>
            )}
          </ModalShell>
        )}

      {rejectRow && (
        <ModalShell
          title="Reject with remarks"
          onClose={() => setRejectRow(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setRejectRow(null)}>Cancel</button>
              <button
                type="button"
                className="btn btn-bad"
                disabled={acting}
                onClick={() => void rejectEntity()}
              >
                Confirm reject
              </button>
            </>
          }
        >
          <label className="fld">
            <span className="l">Remarks (optional)</span>
            <textarea
              className="input"
              rows={3}
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Reason for rejection…"
            />
          </label>
        </ModalShell>
      )}
    </div>
  );
}
