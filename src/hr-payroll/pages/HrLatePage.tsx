import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
import { useHrLateExemptions, useHrApprovals } from "../hooks/useHrRequests";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ApprovalTrail } from "../components/ui/ApprovalTrail";
import { ModalShell } from "../components/ui/ModalShell";
import { HR_ORG_ID } from "../lib/constants";
import { hrAudit, processApprovalDecision, rebuildPayrollLine } from "../lib/hrApi";
import type { LateExemptionRow } from "../lib/types";

function delayMinutes(official: string, actual: string): number {
  const [oh, om] = official.split(":").map(Number);
  const [ah, am] = actual.split(":").map(Number);
  return Math.max(0, ah * 60 + am - (oh * 60 + om));
}

function LateRequestModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const { data: employees = [] } = useHrEmployees();
  const [f, setF] = useState({
    employee_id: employees[0]?.id ?? "",
    late_date: "",
    official_in: "10:00",
    actual_in: "",
    reason: "",
  });
  const [err, setErr] = useState<Record<string, string>>({});

  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.employee_id) e.employee_id = "Required";
    if (!f.late_date) e.late_date = "Required";
    if (!f.actual_in) e.actual_in = "Required";
    setErr(e);
    if (Object.keys(e).length) return;

    const delay_min = delayMinutes(f.official_in, f.actual_in);
    const { error } = await supabase.from("late_exemptions" as never).insert({
      org_id: HR_ORG_ID,
      employee_id: f.employee_id,
      late_date: f.late_date,
      official_in: f.official_in,
      actual_in: f.actual_in,
      delay_min,
      reason: f.reason.trim() || null,
      status: "Pending",
    } as never);
    if (error) {
      onSaved(error.message);
      return;
    }
    await hrAudit("Late Exemption Requested", f.late_date);
    onSaved("Late exemption submitted");
    onClose();
  };

  return (
    <ModalShell
      title="Request Late Exemption"
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
          className={`input${err.late_date ? " err" : ""}`}
          type="date"
          value={f.late_date}
          onChange={(e) => setF({ ...f, late_date: e.target.value })}
        />
      </label>
      <div className="grid g2" style={{ gap: "0 16px" }}>
        <label className="fld">
          <span className="l">Official in</span>
          <input
            className="input"
            type="time"
            value={f.official_in}
            onChange={(e) => setF({ ...f, official_in: e.target.value })}
          />
        </label>
        <label className="fld">
          <span className="l">Actual in</span>
          <input
            className={`input${err.actual_in ? " err" : ""}`}
            type="time"
            value={f.actual_in}
            onChange={(e) => setF({ ...f, actual_in: e.target.value })}
          />
        </label>
      </div>
      <label className="fld">
        <span className="l">Reason</span>
        <textarea
          className="input"
          rows={2}
          value={f.reason}
          onChange={(e) => setF({ ...f, reason: e.target.value })}
        />
      </label>
    </ModalShell>
  );
}

export default function HrLatePage() {
  const { can, fire, cycle } = useHrAccess();
  const qc = useQueryClient();
  const { data: late = [], isLoading } = useHrLateExemptions();
  const lateIds = late.map((l) => l.id);
  const { data: approvals = [] } = useHrApprovals("late", lateIds);
  const [open, setOpen] = useState(false);

  const setStatus = async (row: LateExemptionRow, status: string) => {
    try {
      const result = (await processApprovalDecision("late", row.id, status)) as {
        status?: string;
      } | null;
      if (result?.status === "Approved" && cycle?.id) {
        await rebuildPayrollLine(row.employee_id, cycle.id);
      }
      await hrAudit(`Late ${status}`, row.employees?.full_name ?? row.id, row.status, status);
      fire(result?.status === "Pending" ? "Stage approved — awaiting next approver" : `Late exemption ${status.toLowerCase()}`);
      await qc.invalidateQueries({ queryKey: ["hr-late"] });
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
          <strong>Rule:</strong> report 10:00, grace to 10:05, &gt;1hr = Half Day, &gt;3hr = Absent.
          Monthly slab: 1–3 late = 1 day deduction (editable in Config). Approving an exemption
          removes one late count and recalculates salary.
        </div>
      </div>
      <div className="card-h">
        <span className="tag">Late Coming</span>
        {can("apply") && (
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            + Request Exemption
          </button>
        )}
      </div>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        {isLoading ? (
          <div className="empty">Loading…</div>
        ) : late.length === 0 ? (
          <div className="empty">
            <div className="ico">◷</div>
            No requests.
          </div>
        ) : (
          <table style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Employee</th>
                <th>Date</th>
                <th>Official</th>
                <th>Actual</th>
                <th>Delay</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {late.map((l) => (
                <tr key={l.id}>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {l.id.slice(0, 8)}
                  </td>
                  <td className="strong">{l.employees?.full_name}</td>
                  <td>{l.late_date}</td>
                  <td className="mono">{l.official_in?.slice(0, 5)}</td>
                  <td className="mono">{l.actual_in?.slice(0, 5)}</td>
                  <td style={{ color: "var(--clay)", fontWeight: 600 }}>
                    {l.delay_min}m
                    {l.delay_min > 60 && (
                      <div style={{ fontSize: 10, color: "var(--rose)" }}>→ Half Day</div>
                    )}
                  </td>
                  <td style={{ fontSize: 12 }}>{l.reason}</td>
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
                              onClick={() => void setStatus(l, "Rejected")}
                            >
                              Reject
                            </button>
                          </>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {open && (
        <LateRequestModal
          onClose={() => setOpen(false)}
          onSaved={async (m) => {
            fire(m);
            await qc.invalidateQueries({ queryKey: ["hr-late"] });
            await qc.invalidateQueries({ queryKey: ["hr-pending-counts"] });
          }}
        />
      )}
    </div>
  );
}
