import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
import { useHrMispunchRequests, useHrApprovals } from "../hooks/useHrRequests";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ApprovalTrail } from "../components/ui/ApprovalTrail";
import { ModalShell } from "../components/ui/ModalShell";
import { HR_ORG_ID } from "../lib/constants";
import { hrAudit, processApprovalDecision, rebuildPayrollLine } from "../lib/hrApi";
import type { MispunchRequestRow } from "../lib/types";

const MISPUNCH_ISSUES = [
  "Missing Punch In",
  "Missing Punch Out",
  "Wrong Punch Time",
  "Forgot to Punch",
] as const;

function MispunchRequestModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const { data: employees = [] } = useHrEmployees();
  const [f, setF] = useState({
    employee_id: employees[0]?.id ?? "",
    punch_date: "",
    issue: MISPUNCH_ISSUES[0],
    evidence: "",
  });
  const [err, setErr] = useState<Record<string, string>>({});

  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.employee_id) e.employee_id = "Required";
    if (!f.punch_date) e.punch_date = "Required";
    setErr(e);
    if (Object.keys(e).length) return;

    const { error } = await supabase.from("mispunch_requests" as never).insert({
      org_id: HR_ORG_ID,
      employee_id: f.employee_id,
      punch_date: f.punch_date,
      issue: f.issue,
      evidence: f.evidence.trim() || null,
      status: "Pending",
    } as never);
    if (error) {
      onSaved(error.message);
      return;
    }
    await hrAudit("Mispunch Requested", f.punch_date);
    onSaved("Mispunch request submitted");
    onClose();
  };

  return (
    <ModalShell
      title="Request Mispunch Regularization"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => void save()}>Submit</button>
        </>
      }
    >
      <label className="fld">
        <span className="l">Employee</span>
        <select
          className={`input${err.employee_id ? " err" : ""}`}
          value={f.employee_id}
          onChange={(e) => setF({ ...f, employee_id: e.target.value })}
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.full_name}</option>
          ))}
        </select>
      </label>
      <label className="fld">
        <span className="l">Date</span>
        <input
          className={`input${err.punch_date ? " err" : ""}`}
          type="date"
          value={f.punch_date}
          onChange={(e) => setF({ ...f, punch_date: e.target.value })}
        />
      </label>
      <label className="fld">
        <span className="l">Issue</span>
        <select className="input" value={f.issue} onChange={(e) => setF({ ...f, issue: e.target.value })}>
          {MISPUNCH_ISSUES.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </label>
      <label className="fld">
        <span className="l">Evidence / notes</span>
        <textarea
          className="input"
          rows={2}
          value={f.evidence}
          onChange={(e) => setF({ ...f, evidence: e.target.value })}
          placeholder="Brief description or reference"
        />
      </label>
    </ModalShell>
  );
}

export default function HrMispunchPage() {
  const { can, fire, cycle } = useHrAccess();
  const qc = useQueryClient();
  const { data: mispunch = [], isLoading } = useHrMispunchRequests();
  const mispunchIds = mispunch.map((m) => m.id);
  const { data: approvals = [] } = useHrApprovals("mispunch", mispunchIds);
  const [open, setOpen] = useState(false);

  const setStatus = async (row: MispunchRequestRow, status: string) => {
    try {
      const result = (await processApprovalDecision("mispunch", row.id, status)) as {
        status?: string;
      } | null;
      if (result?.status === "Approved" && cycle?.id) {
        await rebuildPayrollLine(row.employee_id, cycle.id);
      }
      await hrAudit(`Mispunch ${status}`, row.employees?.full_name ?? row.id, row.status, status);
      fire(result?.status === "Pending" ? "Stage approved — awaiting next approver" : `Mispunch ${status.toLowerCase()}`);
      await qc.invalidateQueries({ queryKey: ["hr-mispunch"] });
      await qc.invalidateQueries({ queryKey: ["hr-pending-counts"] });
      await qc.invalidateQueries({ queryKey: ["hr-approvals"] });
      await qc.invalidateQueries({ queryKey: ["hr-payroll-lines"] });
    } catch (e) {
      fire(e instanceof Error ? e.message : "Update failed");
    }
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ background: "#fff7ed", borderColor: "#fed7aa" }}>
        <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          <strong>Rule:</strong> 2 free per month, then <span className="mono">(count − 2) × 0.5</span>{" "}
          day each. Approving a correction removes one mispunch from payroll.
        </div>
      </div>
      <div className="card-h">
        <span className="tag">Mispunch</span>
        {can("apply") && (
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            + Request Regularization
          </button>
        )}
      </div>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        {isLoading ? (
          <div className="empty">Loading…</div>
        ) : mispunch.length === 0 ? (
          <div className="empty">
            <div className="ico">⊠</div>
            No requests.
          </div>
        ) : (
          <table style={{ minWidth: 680 }}>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Employee</th>
                <th>Date</th>
                <th>Issue</th>
                <th>Evidence</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {mispunch.map((m) => (
                <tr key={m.id}>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {m.id.slice(0, 8)}
                  </td>
                  <td className="strong">{m.employees?.full_name}</td>
                  <td>{m.punch_date}</td>
                  <td>{m.issue}</td>
                  <td className="muted" style={{ fontSize: 12 }}>{m.evidence ?? "—"}</td>
                  <td>
                    <StatusBadge status={m.status} />
                    <ApprovalTrail entityId={m.id} approvals={approvals} />
                  </td>
                  <td>
                    <div className="row-flex">
                      {can("approve") ? (
                        m.status === "Pending" ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-good"
                              onClick={() => void setStatus(m, "Approved")}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-bad"
                              onClick={() => void setStatus(m, "Rejected")}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => void setStatus(m, "Pending")}
                          >
                            Reopen
                          </button>
                        )
                      ) : (
                        <span className="muted" style={{ fontSize: 11.5 }}>
                          view only
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {open && (
        <MispunchRequestModal
          onClose={() => setOpen(false)}
          onSaved={async (m) => {
            fire(m);
            await qc.invalidateQueries({ queryKey: ["hr-mispunch"] });
            await qc.invalidateQueries({ queryKey: ["hr-pending-counts"] });
          }}
        />
      )}
    </div>
  );
}
