import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
import { useHrLeaveRequests, useHrLeaveBalances, useHrApprovals } from "../hooks/useHrRequests";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ModalShell } from "../components/ui/ModalShell";
import { HR_ORG_ID } from "../lib/constants";
import { hrAudit, processApprovalDecision, rebuildPayrollLine } from "../lib/hrApi";
import { ApprovalTrail } from "../components/ui/ApprovalTrail";
import type { LeaveRequestRow } from "../lib/types";

function LeaveModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const { data: employees = [] } = useHrEmployees();
  const [f, setF] = useState({
    employee_id: employees[0]?.id ?? "",
    type: "Annual Leave",
    from_date: "",
    to_date: "",
    days: 1,
    reason: "",
    has_document: false,
  });
  const { data: balances = [] } = useHrLeaveBalances(f.employee_id || undefined);
  const [err, setErr] = useState<Record<string, string>>({});

  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.from_date) e.from_date = "Required";
    if (!f.reason.trim()) e.reason = "Reason required";
    if (!f.days || f.days <= 0) e.days = "> 0";
    setErr(e);
    if (Object.keys(e).length) return;

    const { error } = await supabase.from("leave_requests" as never).insert({
      org_id: HR_ORG_ID,
      employee_id: f.employee_id,
      type: f.type,
      from_date: f.from_date,
      to_date: f.to_date || f.from_date,
      days: f.days,
      reason: f.reason.trim(),
      has_document: f.has_document,
      status: "Pending",
    } as never);
    if (error) {
      onSaved(error.message);
      return;
    }
    await hrAudit("Leave Applied", f.type, "—", f.from_date);
    onSaved("Leave submitted");
    onClose();
  };

  return (
    <ModalShell
      title="Apply for Leave"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void save()}>
            Submit
          </button>
        </>
      }
    >
      <label className="fld">
        <span className="l">Employee</span>
        <select
          className="input"
          value={f.employee_id}
          onChange={(e) => setF({ ...f, employee_id: e.target.value })}
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name}
            </option>
          ))}
        </select>
      </label>
      {balances.length > 0 && (
        <div className="card" style={{ padding: 12, marginBottom: 12, background: "var(--paper)" }}>
          <div style={{ fontSize: 11, color: "var(--mut)", fontWeight: 600, marginBottom: 6 }}>
            Leave balance (remaining)
          </div>
          <div className="row-flex">
            {balances.map((b) => (
              <span key={b.id} className="tag">
                {b.type}: {(b.accrued - b.taken).toFixed(1)} / {b.entitled}
              </span>
            ))}
          </div>
        </div>
      )}
      <label className="fld">
        <span className="l">Leave Type</span>
        <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
          {[
            "Annual Leave",
            "Sick Leave",
            "Casual Leave",
            "Comp-Off Leave",
            "Special Leave",
            "Unpaid Leave",
          ].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </label>
      <div className="grid g3" style={{ gap: "0 14px" }}>
        <label className="fld">
          <span className="l">From</span>
          <input
            className={`input${err.from_date ? " err" : ""}`}
            type="date"
            value={f.from_date}
            onChange={(e) => setF({ ...f, from_date: e.target.value })}
          />
        </label>
        <label className="fld">
          <span className="l">To</span>
          <input
            className="input"
            type="date"
            value={f.to_date}
            onChange={(e) => setF({ ...f, to_date: e.target.value })}
          />
        </label>
        <label className="fld">
          <span className="l">Days</span>
          <input
            className={`input mono${err.days ? " err" : ""}`}
            type="number"
            step="0.5"
            value={f.days}
            onChange={(e) => setF({ ...f, days: parseFloat(e.target.value) || 0 })}
          />
        </label>
      </div>
      <label className="fld">
        <span className="l">Reason</span>
        <textarea
          className={`input${err.reason ? " err" : ""}`}
          rows={2}
          value={f.reason}
          onChange={(e) => setF({ ...f, reason: e.target.value })}
        />
      </label>
      <label className="row-flex" style={{ fontSize: 13, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={f.has_document}
          onChange={(e) => setF({ ...f, has_document: e.target.checked })}
        />
        Document attached (medical/proof)
      </label>
    </ModalShell>
  );
}

export default function HrLeavePage() {
  const { can, fire, cycle } = useHrAccess();
  const qc = useQueryClient();
  const { data: leaves = [], isLoading } = useHrLeaveRequests();
  const leaveIds = leaves.map((l) => l.id);
  const { data: approvals = [] } = useHrApprovals("leave", leaveIds);
  const [open, setOpen] = useState(false);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [rejectRow, setRejectRow] = useState<LeaveRequestRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const filteredLeaves = leaves.filter((l) => {
    if (filterFrom && l.from_date < filterFrom) return false;
    if (filterTo && l.from_date > filterTo) return false;
    return true;
  });

  const setStatus = async (row: LeaveRequestRow, status: string, rejectionReason?: string) => {
    try {
      const result = (await processApprovalDecision(
        "leave",
        row.id,
        status,
        rejectionReason,
      )) as {
        status?: string;
      } | null;
      if (status === "Rejected" && rejectionReason) {
        await supabase
          .from("leave_requests" as never)
          .update({ rejection_reason: rejectionReason } as never)
          .eq("id", row.id);
      }
      if (result?.status === "Approved" && cycle?.id) {
        await rebuildPayrollLine(row.employee_id, cycle.id);
      }
      await hrAudit(`Leave ${status}`, row.employees?.full_name ?? row.id, row.status, status);
      fire(result?.status === "Pending" ? "Stage approved — awaiting next approver" : `Leave ${status.toLowerCase()}`);
      await qc.invalidateQueries({ queryKey: ["hr-leaves"] });
      await qc.invalidateQueries({ queryKey: ["hr-leave-balances"] });
      await qc.invalidateQueries({ queryKey: ["hr-pending-counts"] });
      await qc.invalidateQueries({ queryKey: ["hr-approvals"] });
      await qc.invalidateQueries({ queryKey: ["hr-payroll-lines"] });
    } catch (e) {
      fire(e instanceof Error ? e.message : "Update failed");
    }
  };

  const cancelLeave = async (row: LeaveRequestRow) => {
    if (!confirm("Cancel this leave request?")) return;
    const { error } = await supabase
      .from("leave_requests" as never)
      .update({ status: "Cancelled", cancelled_at: new Date().toISOString() } as never)
      .eq("id", row.id);
    if (error) {
      fire(error.message);
      return;
    }
    fire("Leave cancelled");
    await qc.invalidateQueries({ queryKey: ["hr-leaves"] });
  };

  const remove = async (row: LeaveRequestRow) => {
    if (!confirm("Delete this leave request?")) return;
    const { error } = await supabase.from("leave_requests" as never).delete().eq("id", row.id);
    if (error) {
      fire(error.message);
      return;
    }
    fire("Leave deleted");
    await qc.invalidateQueries({ queryKey: ["hr-leaves"] });
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card-h">
        <span className="tag">6-Day: 18/yr (1.5/mo) · 5-Day: 10/yr · Sick cap 8 · final approval: HR</span>
        <div className="row-flex">
          <input
            className="input"
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            title="From date"
          />
          <input
            className="input"
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            title="To date"
          />
          {can("apply") && (
            <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
              + Apply Leave
            </button>
          )}
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        {isLoading ? (
          <div className="empty">Loading…</div>
        ) : filteredLeaves.length === 0 ? (
          <div className="empty">
            <div className="ico">⊟</div>
            No leave requests.
          </div>
        ) : (
          <table style={{ minWidth: 800 }}>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Employee</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Doc</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.map((l) => (
                <tr key={l.id}>
                  <td className="mono strong" style={{ fontSize: 12 }}>
                    {l.id.slice(0, 8)}
                  </td>
                  <td>
                    {l.employees?.full_name}
                    <div className="muted" style={{ fontSize: 11.5 }}>
                      {l.reason}
                      {l.rejection_reason && (
                        <span style={{ color: "var(--rose)" }}> · Rejected: {l.rejection_reason}</span>
                      )}
                      {l.cancelled_at && (
                        <span style={{ color: "var(--mut)" }}> · Cancelled</span>
                      )}
                    </div>
                  </td>
                  <td>{l.type}</td>
                  <td>
                    {l.from_date}
                    {l.from_date !== l.to_date ? ` – ${l.to_date}` : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>{l.days}</td>
                  <td>{l.has_document ? <span className="tag">📎</span> : <span className="muted">—</span>}</td>
                  <td>
                    <StatusBadge status={l.status} />
                    <ApprovalTrail entityId={l.id} approvals={approvals} />
                  </td>
                  <td>
                    <div className="row-flex">
                      {can("approve") ? (
                        l.status === "Pending" ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-good"
                              onClick={() => void setStatus(l, "Approved")}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-bad"
                              onClick={() => {
                                setRejectRow(l);
                                setRejectReason("");
                              }}
                            >
                              Reject
                            </button>
                          </>
                        ) : l.status === "Pending" && can("apply") ? (
                          <button type="button" className="btn btn-sm" onClick={() => void cancelLeave(l)}>
                            Cancel
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => void setStatus(l, "Pending")}
                          >
                            Reopen
                          </button>
                        )
                      ) : (
                        <span className="muted" style={{ fontSize: 11.5 }}>
                          view only
                        </span>
                      )}
                      {can("approve") && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost btn-bad"
                          onClick={() => void remove(l)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {rejectRow && (
        <ModalShell
          title="Reject leave request"
          onClose={() => setRejectRow(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setRejectRow(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-bad"
                disabled={!rejectReason.trim()}
                onClick={() => {
                  void setStatus(rejectRow, "Rejected", rejectReason.trim()).then(() =>
                    setRejectRow(null),
                  );
                }}
              >
                Reject
              </button>
            </>
          }
        >
          <label className="fld">
            <span className="l">Rejection reason (required)</span>
            <textarea
              className="input"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason shown to employee"
            />
          </label>
        </ModalShell>
      )}
      {open && (
        <LeaveModal
          onClose={() => setOpen(false)}
          onSaved={(m) => {
            fire(m);
            void qc.invalidateQueries({ queryKey: ["hr-leaves"] });
            void qc.invalidateQueries({ queryKey: ["hr-pending-counts"] });
          }}
        />
      )}
    </div>
  );
}
