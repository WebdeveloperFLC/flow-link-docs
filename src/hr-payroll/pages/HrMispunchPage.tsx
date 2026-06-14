import { useQueryClient } from "@tanstack/react-query";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrMispunchRequests, useHrApprovals } from "../hooks/useHrRequests";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ApprovalTrail } from "../components/ui/ApprovalTrail";
import { hrAudit, processApprovalDecision, rebuildPayrollLine } from "../lib/hrApi";
import type { MispunchRequestRow } from "../lib/types";

export default function HrMispunchPage() {
  const { can, fire, cycle } = useHrAccess();
  const qc = useQueryClient();
  const { data: mispunch = [], isLoading } = useHrMispunchRequests();
  const mispunchIds = mispunch.map((m) => m.id);
  const { data: approvals = [] } = useHrApprovals("mispunch", mispunchIds);

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
                  <td>
                    <span className="tag">📎 {m.evidence ?? "—"}</span>
                  </td>
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
    </div>
  );
}
