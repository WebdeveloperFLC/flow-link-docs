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
import { useHrEmployees, useHrReferenceData } from "../hooks/useHrEmployees";
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
  requestClarification,
  rpcErrorMessage,
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
import {
  matchesApprovalStatusFilter,
  isPendingApprovalStatus,
  approvalStatusDisplay,
  type ApprovalStatusFilter,
} from "../lib/approvalQueue";
import { getHrDocumentSignedUrl, downloadHrDocument } from "../lib/hrStorage";

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
  const { data: employees = [] } = useHrEmployees();
  const { data: ref } = useHrReferenceData();

  const [filterSearch, setFilterSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState("All");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterStatus, setFilterStatus] = useState<ApprovalStatusFilter>("Pending");

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
  const [approveRow, setApproveRow] = useState<QueueRow | null>(null);
  const [approveComment, setApproveComment] = useState("");
  const [clarifyMode, setClarifyMode] = useState(false);
  const [acting, setActing] = useState(false);

  const empById = useMemo(() => {
    const m = new Map<string, (typeof employees)[0]>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);

  const branchOptions = useMemo(() => {
    const fromRef = (ref?.branches ?? []).map((b) => [b.id, b.name] as const);
    if (fromRef.length) return fromRef.sort((a, b) => a[1].localeCompare(b[1]));
    const names = new Map<string, string>();
    for (const e of employees) {
      if (e.branch_id && e.branches?.name) names.set(e.branch_id, e.branches.name);
    }
    return [...names.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [employees, ref?.branches]);

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

  const openStoragePath = async (path: string | null | undefined, label: string) => {
    if (!path) {
      fire(`No ${label} attached`);
      return;
    }
    try {
      const url = await getHrDocumentSignedUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      fire(rpcErrorMessage(e, `Could not open ${label}`));
    }
  };

  const downloadStoragePath = async (
    path: string | null | undefined,
    fileName: string,
    label: string,
  ) => {
    if (!path) {
      fire(`No ${label} attached`);
      return;
    }
    try {
      await downloadHrDocument(path, fileName);
      fire(`${label} downloaded`);
    } catch (e) {
      fire(rpcErrorMessage(e, `Could not download ${label}`));
    }
  };

  const rows = useMemo<QueueRow[]>(() => {
    if (selected === "leave") {
      return leaves.map((l) => ({
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
      return compoff.map((c) => ({
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
      return late.map((l) => ({
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
      return mispunch.map((m) => ({
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
      return training.map((t) => ({
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
    leaves,
    compoff,
    late,
    mispunch,
    training,
    payrollPending,
    cycle,
  ]);

  const requestDate = (row: QueueRow): string => {
    if (row.leave) return row.leave.from_date;
    if (row.compoff) return row.compoff.worked_date;
    if (row.late) return row.late.late_date;
    if (row.mispunch) return row.mispunch.punch_date;
    if (row.training) return row.training.start_date ?? "";
    return "";
  };

  const filteredRows = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return rows.filter((row) => {
      if (!matchesApprovalStatusFilter(row.category, row.status, filterStatus)) return false;
      if (q) {
        const hay = `${row.employeeName} ${row.details}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterBranch !== "All" && row.employeeId) {
        const emp = empById.get(row.employeeId);
        if (emp?.branch_id !== filterBranch) return false;
      }
      const d = requestDate(row);
      if (filterFrom && d && d < filterFrom) return false;
      if (filterTo && d && d > filterTo) return false;
      return true;
    });
  }, [rows, filterSearch, filterBranch, filterFrom, filterTo, filterStatus, empById]);

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
      setApproveRow(null);
      await invalidateAll();
    } catch (e) {
      fire(rpcErrorMessage(e, "Approval failed"));
    } finally {
      setActing(false);
    }
  };

  const rejectEntity = async () => {
    if (!rejectRow) return;
    setActing(true);
    try {
      const comment = rejectComment.trim() || undefined;
      if (clarifyMode) {
        if (!comment) {
          fire("Clarification comment is required");
          return;
        }
        if (rejectRow.category === "training") {
          fire("Use Reject on training requests — clarification applies to leave, comp-off, late, and mispunch");
          return;
        }
        await requestClarification(rejectRow.category, rejectRow.id, comment);
        await hrAudit("Clarification Requested", rejectRow.employeeName, rejectRow.category, comment);
        fire("Sent back for clarification — awaiting employee response");
      } else if (rejectRow.category === "leave" && rejectRow.leave) {
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
      setClarifyMode(false);
      setViewRow(null);
      await invalidateAll();
    } catch (e) {
      fire(rpcErrorMessage(e, clarifyMode ? "Clarification request failed" : "Rejection failed"));
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
          <span className="tag">{filteredRows.length} shown</span>
        </div>

        <div className="card-h" style={{ padding: "0 16px 12px", flexWrap: "wrap", gap: 10 }}>
          <input
            className="input"
            placeholder="Search employee or details…"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            style={{ minWidth: 200, flex: 1 }}
          />
          <select className="input" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
            <option value="All">All branches</option>
            {branchOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <input className="input" type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} title="From date" />
          <input className="input" type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} title="To date" />
          <select
            className="input"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ApprovalStatusFilter)}
          >
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Clarification Required">Clarification Required</option>
            <option value="All">All statuses</option>
          </select>
        </div>

        {!canApprove && selected !== "payroll" && (
          <div className="empty" style={{ padding: 20 }}>
            Your role cannot approve requests. Switch to a role with Approve permission to act here.
          </div>
        )}

        {filteredRows.length === 0 ? (
          <div className="empty">
            <div className="ico">✓</div>
            No items match the current filters.
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
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.employeeId ? (
                      <Employee360Link employeeId={row.employeeId} name={row.employeeName} />
                    ) : (
                      <span className="strong">{row.employeeName}</span>
                    )}
                  </td>
                  <td className="muted" style={{ fontSize: 12.5 }}>{row.details}</td>
                  <td><StatusBadge status={approvalStatusDisplay(row.status)} /></td>
                  <td>
                    <div className="row-flex" style={{ gap: 6, flexWrap: "wrap" }}>
                      <button type="button" className="btn btn-sm" onClick={() => setViewRow(row)}>
                        View
                      </button>
                      {canApprove && isPendingApprovalStatus(row.category, row.status) && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-good"
                            disabled={acting}
                            onClick={() => {
                              setApproveRow(row);
                              setApproveComment("");
                            }}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm"
                            disabled={acting}
                            onClick={() => {
                              setRejectRow(row);
                              setRejectComment("");
                              setClarifyMode(true);
                            }}
                          >
                            Clarify
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-bad"
                            disabled={acting}
                            onClick={() => {
                              setRejectRow(row);
                              setRejectComment("");
                              setClarifyMode(false);
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
          {viewRow.leave.has_document && (
            <p>
              <strong>Supporting document:</strong>{" "}
              <button
                type="button"
                className="btn btn-sm"
                onClick={() =>
                  void openStoragePath(
                    viewRow.leave?.employee_documents?.storage_path,
                    "leave document",
                  )
                }
              >
                View
              </button>{" "}
              <button
                type="button"
                className="btn btn-sm"
                onClick={() =>
                  void downloadStoragePath(
                    viewRow.leave?.employee_documents?.storage_path,
                    viewRow.leave?.employee_documents?.file_name ?? "leave-document",
                    "leave document",
                  )
                }
              >
                Download
              </button>
              <span className="muted" style={{ marginLeft: 6, fontSize: 12 }}>
                {viewRow.leave.employee_documents?.file_name ?? "attachment"}
              </span>
            </p>
          )}
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

      {viewRow?.category === "compoff" && viewRow.compoff && (
        <ModalShell
          title="Comp-off request"
          onClose={() => setViewRow(null)}
          footer={
            <button type="button" className="btn" onClick={() => setViewRow(null)}>Close</button>
          }
        >
          <p><strong>Worked date:</strong> {viewRow.compoff.worked_date}</p>
          <p><strong>Occasion:</strong> {viewRow.compoff.occasion ?? "—"}</p>
          <p><strong>Duration:</strong> {viewRow.compoff.duration_type ?? "Full day"}</p>
          {viewRow.compoff.comp_off_leave_date && (
            <p><strong>Comp-off leave date:</strong> {viewRow.compoff.comp_off_leave_date}</p>
          )}
          <p><strong>Reason:</strong> {viewRow.compoff.reason ?? "—"}</p>
          <p><strong>Status:</strong> {viewRow.compoff.status}</p>
          {viewRow.compoff.document_path && (
            <p>
              <strong>Supporting attachment:</strong>{" "}
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => void openStoragePath(viewRow.compoff?.document_path, "comp-off evidence")}
              >
                View
              </button>{" "}
              <button
                type="button"
                className="btn btn-sm"
                onClick={() =>
                  void downloadStoragePath(
                    viewRow.compoff?.document_path,
                    "comp-off-evidence",
                    "comp-off evidence",
                  )
                }
              >
                Download
              </button>
            </p>
          )}
        </ModalShell>
      )}

      {viewRow?.category === "late" && viewRow.late && (
        <ModalShell
          title="Late exemption request"
          onClose={() => setViewRow(null)}
          footer={
            <button type="button" className="btn" onClick={() => setViewRow(null)}>Close</button>
          }
        >
          <p><strong>Date:</strong> {viewRow.late.late_date}</p>
          <p><strong>Official in:</strong> {viewRow.late.official_in ?? "—"}</p>
          <p><strong>Actual in:</strong> {viewRow.late.actual_in ?? "—"}</p>
          <p><strong>Delay:</strong> {viewRow.late.delay_min} min</p>
          <p><strong>Reason:</strong> {viewRow.late.reason ?? "—"}</p>
          <p><strong>Status:</strong> {viewRow.late.status}</p>
        </ModalShell>
      )}

      {viewRow?.category === "mispunch" && viewRow.mispunch && (
        <ModalShell
          title="Mispunch request"
          onClose={() => setViewRow(null)}
          footer={
            <button type="button" className="btn" onClick={() => setViewRow(null)}>Close</button>
          }
        >
          <p><strong>Date:</strong> {viewRow.mispunch.punch_date}</p>
          <p><strong>Issue:</strong> {viewRow.mispunch.issue}</p>
          <p><strong>Evidence:</strong> {viewRow.mispunch.evidence ?? "—"}</p>
          <p><strong>Status:</strong> {viewRow.mispunch.status}</p>
        </ModalShell>
      )}

      {viewRow &&
        viewRow.category === "payroll" && (
          <ModalShell
            title="Request details"
            onClose={() => setViewRow(null)}
            footer={
              <button type="button" className="btn" onClick={() => setViewRow(null)}>Close</button>
            }
          >
            <p className="muted" style={{ fontSize: 13 }}>{viewRow.details}</p>
          </ModalShell>
        )}

      {viewRow &&
        viewRow.category !== "leave" &&
        viewRow.category !== "training" &&
        viewRow.category !== "compoff" &&
        viewRow.category !== "late" &&
        viewRow.category !== "mispunch" &&
        viewRow.category !== "payroll" && (
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

      {approveRow && (
        <ModalShell
          title="Approve with remarks"
          onClose={() => setApproveRow(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setApproveRow(null)}>Cancel</button>
              <button
                type="button"
                className="btn btn-good"
                disabled={acting}
                onClick={() => void approveEntity(approveRow, approveComment.trim() || undefined)}
              >
                Confirm approve
              </button>
            </>
          }
        >
          <label className="fld">
            <span className="l">Remarks (optional)</span>
            <textarea
              className="input"
              rows={3}
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              placeholder="Approval note for audit trail"
            />
          </label>
        </ModalShell>
      )}

      {rejectRow && (
        <ModalShell
          title={clarifyMode ? "Return for clarification" : "Reject with remarks"}
          onClose={() => {
            setRejectRow(null);
            setClarifyMode(false);
          }}
          footer={
            <>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setRejectRow(null);
                  setClarifyMode(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-bad"
                disabled={acting || (clarifyMode && !rejectComment.trim())}
                onClick={() => void rejectEntity()}
              >
                {clarifyMode ? "Send back" : "Confirm reject"}
              </button>
            </>
          }
        >
          <label className="fld">
            <span className="l">{clarifyMode ? "Clarification required" : "Remarks (optional)"}</span>
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
