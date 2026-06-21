import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees, useHrReferenceData } from "../hooks/useHrEmployees";
import { useHrApprovals, useHrTrainingRecords } from "../hooks/useHrRequests";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ApprovalTrail } from "../components/ui/ApprovalTrail";
import { ModalShell } from "../components/ui/ModalShell";
import { TrainingFilterBar } from "../components/training/TrainingFilterBar";
import { ExtendTrainingModal, CompleteTrainingModal } from "../components/training/TrainingWorkflowModals";
import { TrainingAuditPanel } from "../components/training/TrainingAuditPanel";
import { HR_ORG_ID } from "../lib/constants";
import { getHrActorInfo, hrAudit, assignTrainingRecord, processApprovalDecision } from "../lib/hrApi";
import {
  defaultTrainingFilters,
  filterTrainingRecords,
  trainingEffectiveEnd,
  type TrainingFilters,
} from "../lib/trainingFilters";
import type { TrainingRecordRow } from "../lib/types";

const ACTIVE_STATUSES = new Set(["In Progress", "Extended"]);

function TrainingModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const { data: employees = [] } = useHrEmployees();
  const [f, setF] = useState({
    employee_id: employees[0]?.id ?? "",
    type: "Paid Training",
    training_ref: "",
    duration: "30 days",
    unpaid_days: 0,
    start_date: "",
    end_date: "",
  });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!f.employee_id) {
      setErr("Select an employee");
      return;
    }
    setErr("");
    setSaving(true);
    try {
      const actor = await getHrActorInfo();
      await assignTrainingRecord({
        employee_id: f.employee_id,
        type: f.type,
        duration: f.duration,
        unpaid_days: parseInt(String(f.unpaid_days), 10) || 0,
        start_date: f.start_date || null,
        end_date: f.end_date || null,
        training_ref: f.training_ref.trim() || null,
        created_by_id: actor.id,
        created_by_label: actor.label,
      });
      await hrAudit("Training Assigned", f.type, actor.label);
      onSaved("Training assigned");
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Assign failed";
      setErr(message);
      onSaved(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Assign Training"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
            Assign
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
            <option key={e.id} value={e.id}>{e.full_name}</option>
          ))}
        </select>
      </label>
      <div className="grid g2" style={{ gap: "0 16px" }}>
        <label className="fld">
          <span className="l">Training reference</span>
          <input
            className="input"
            placeholder="Optional reference code"
            value={f.training_ref}
            onChange={(e) => setF({ ...f, training_ref: e.target.value })}
          />
        </label>
        <label className="fld">
          <span className="l">Type</span>
          <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            {["Paid Training", "Unpaid Training"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="fld">
          <span className="l">Duration label</span>
          <input
            className="input"
            value={f.duration}
            onChange={(e) => setF({ ...f, duration: e.target.value })}
          />
        </label>
        <label className="fld">
          <span className="l">Unpaid Days (max 7)</span>
          <input
            className="input mono"
            type="number"
            max={7}
            value={f.unpaid_days}
            onChange={(e) => setF({ ...f, unpaid_days: parseInt(e.target.value, 10) || 0 })}
          />
        </label>
        <label className="fld">
          <span className="l">Start date</span>
          <input
            className="input"
            type="date"
            value={f.start_date}
            onChange={(e) => setF({ ...f, start_date: e.target.value })}
          />
        </label>
        <label className="fld">
          <span className="l">End date</span>
          <input
            className="input"
            type="date"
            value={f.end_date}
            onChange={(e) => setF({ ...f, end_date: e.target.value })}
          />
        </label>
      </div>
      {err && (
        <p style={{ color: "var(--rose)", fontSize: 13, marginTop: 8 }}>{err}</p>
      )}
    </ModalShell>
  );
}

export default function HrTrainingPage() {
  const { can, fire } = useHrAccess();
  const qc = useQueryClient();
  const { data: training = [], isLoading } = useHrTrainingRecords();
  const { data: employees = [] } = useHrEmployees();
  const { data: ref } = useHrReferenceData();
  const [filters, setFilters] = useState<TrainingFilters>(defaultTrainingFilters());
  const [assignOpen, setAssignOpen] = useState(false);
  const [extendRow, setExtendRow] = useState<TrainingRecordRow | null>(null);
  const [completeRow, setCompleteRow] = useState<TrainingRecordRow | null>(null);
  const [auditRow, setAuditRow] = useState<TrainingRecordRow | null>(null);
  const mng = can("approve");

  const filtered = useMemo(
    () => filterTrainingRecords(training, filters),
    [training, filters],
  );

  const trainingIds = useMemo(() => filtered.map((t) => t.id), [filtered]);
  const { data: approvals = [] } = useHrApprovals("training", trainingIds);

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["hr-training"] });
    await qc.invalidateQueries({ queryKey: ["hr-approvals"] });
    await qc.invalidateQueries({ queryKey: ["hr-pending-counts"] });
  };

  const remove = async (row: TrainingRecordRow) => {
    if (!confirm("Remove this training record?")) return;
    const { error } = await supabase.from("training_records" as never).delete().eq("id", row.id);
    if (error) {
      fire(error.message);
      return;
    }
    fire("Training removed");
    await invalidate();
  };

  const decide = async (row: TrainingRecordRow, decision: "Approved" | "Rejected") => {
    try {
      await processApprovalDecision("training", row.id, decision);
      fire(decision === "Approved" ? "Approved" : "Rejected");
      await invalidate();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Action failed");
    }
  };

  const canDecide = (row: TrainingRecordRow) =>
    mng &&
    (row.status === "Pending Manager Approval" || row.status === "Pending HR Approval");

  return (
    <div className="page-grid">
      <div className="card-h">
        <span className="tag">Completion requires Manager + HR approval · up to 7 unpaid days</span>
        {mng && (
          <button type="button" className="btn btn-primary" onClick={() => setAssignOpen(true)}>
            + Assign Training
          </button>
        )}
      </div>

      <TrainingFilterBar
        filters={filters}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        branches={ref?.branches ?? []}
        departments={ref?.departments ?? []}
        employees={employees}
      />

      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        {isLoading ? (
          <div className="empty">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="ico">◵</div>
            No training records match filters.
          </div>
        ) : (
          <table style={{ minWidth: 1080 }}>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Employee</th>
                <th>Type</th>
                <th>Start</th>
                <th>End / Extended</th>
                <th>Unpaid</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const endDisplay = trainingEffectiveEnd(t) ?? "—";
                return (
                  <tr key={t.id}>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {t.training_ref ?? t.id.slice(0, 8)}
                    </td>
                    <td className="strong">
                      {t.employees?.full_name}
                      <div className="muted mono" style={{ fontSize: 11 }}>
                        {t.employees?.emp_code}
                      </div>
                    </td>
                    <td>{t.type}</td>
                    <td className="mono">{t.start_date ?? "—"}</td>
                    <td className="mono">
                      {endDisplay}
                      {t.extended_end_date && t.end_date && (
                        <span className="tag" style={{ marginLeft: 4, fontSize: 10 }}>ext</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center", color: t.unpaid_days > 0 ? "var(--rose)" : "inherit" }}>
                      {t.unpaid_days}
                    </td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td>
                      <div className="row-flex" style={{ flexWrap: "wrap", gap: 4 }}>
                        <button type="button" className="btn btn-sm" onClick={() => setAuditRow(t)}>
                          Audit
                        </button>
                        {canDecide(t) && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-good"
                              onClick={() => void decide(t, "Approved")}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-bad"
                              onClick={() => void decide(t, "Rejected")}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {mng && ACTIVE_STATUSES.has(t.status) && (
                          <>
                            <button type="button" className="btn btn-sm" onClick={() => setExtendRow(t)}>
                              Extend
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-good"
                              onClick={() => setCompleteRow(t)}
                            >
                              Complete
                            </button>
                          </>
                        )}
                        {mng && (
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost btn-bad"
                            onClick={() => void remove(t)}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      {(t.status === "Pending Manager Approval" || t.status === "Pending HR Approval") && (
                        <div style={{ marginTop: 6 }}>
                          <ApprovalTrail entityId={t.id} approvals={approvals} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {assignOpen && (
        <TrainingModal
          onClose={() => setAssignOpen(false)}
          onSaved={(m) => {
            fire(m);
            void invalidate();
          }}
        />
      )}
      {extendRow && (
        <ExtendTrainingModal
          row={extendRow}
          onClose={() => setExtendRow(null)}
          onSaved={(m) => {
            fire(m);
            setExtendRow(null);
            void invalidate();
          }}
        />
      )}
      {completeRow && (
        <CompleteTrainingModal
          row={completeRow}
          onClose={() => setCompleteRow(null)}
          onSaved={(m) => {
            fire(m);
            setCompleteRow(null);
            void invalidate();
          }}
        />
      )}
      {auditRow && (
        <ModalShell title="Training audit" onClose={() => setAuditRow(null)} footer={null}>
          <TrainingAuditPanel row={auditRow} />
        </ModalShell>
      )}
    </div>
  );
}
