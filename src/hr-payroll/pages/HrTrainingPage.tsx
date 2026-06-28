import { useMemo, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees, useHrReferenceData } from "../hooks/useHrEmployees";
import { useHrTrainingRecords } from "../hooks/useHrRequests";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ModalShell } from "../components/ui/ModalShell";
import { TrainingFilterBar } from "../components/training/TrainingFilterBar";
import { ExtendTrainingModal, CompleteTrainingModal } from "../components/training/TrainingWorkflowModals";
import { TrainingDetailModal } from "../components/training/TrainingDetailModal";
import { HR_ORG_ID } from "../lib/constants";
import { getHrActorInfo, hrAudit, assignTrainingRecord } from "../lib/hrApi";
import {
  defaultTrainingFilters,
  filterTrainingRecords,
  type TrainingFilters,
} from "../lib/trainingFilters";
import { canBypassTrainingApproval } from "../lib/trainingWorkflow";
import { downloadReportTable, printReportTable } from "../lib/hrReportExport";
import type { TrainingRecordRow } from "../lib/types";

const TRAINING_EXPORT_HEADERS = [
  "Reference",
  "Employee",
  "Type",
  "Start",
  "End",
  "Extended End",
  "Completion Date",
  "Unpaid Days",
  "Duration",
  "Remarks",
  "Status",
];

function trainingExportRows(rows: TrainingRecordRow[]) {
  return rows.map((t) => [
    t.training_ref ?? t.id.slice(0, 8),
    t.employees?.full_name ?? "—",
    t.type,
    t.start_date ?? "—",
    t.end_date ?? "—",
    t.extended_end_date ?? "—",
    t.completion_date ?? "—",
    String(t.unpaid_days),
    t.duration ?? "—",
    t.remarks ?? "—",
    t.status,
  ]);
}

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
    remarks: "",
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
        remarks: f.remarks.trim() || null,
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
      <label className="fld">
        <span className="l">Remarks</span>
        <textarea
          className="input"
          rows={2}
          placeholder="Optional assignment notes for HR / manager"
          value={f.remarks}
          onChange={(e) => setF({ ...f, remarks: e.target.value })}
        />
      </label>
      {err && (
        <p style={{ color: "var(--rose)", fontSize: 13, marginTop: 8 }}>{err}</p>
      )}
    </ModalShell>
  );
}

export default function HrTrainingPage() {
  const location = useLocation();
  const { can, fire, assignedRole } = useHrAccess();
  const qc = useQueryClient();
  const { data: training = [], isLoading } = useHrTrainingRecords();
  const { data: employees = [] } = useHrEmployees();
  const { data: ref } = useHrReferenceData();
  const [filters, setFilters] = useState<TrainingFilters>(defaultTrainingFilters());
  const [assignOpen, setAssignOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<TrainingRecordRow | null>(null);
  const [extendRow, setExtendRow] = useState<TrainingRecordRow | null>(null);
  const [completeRow, setCompleteRow] = useState<TrainingRecordRow | null>(null);
  const mng = can("approve");
  const canExport = can("export");
  const adminBypass = canBypassTrainingApproval(assignedRole);

  const filtered = useMemo(
    () => filterTrainingRecords(training, filters),
    [training, filters],
  );

  useEffect(() => {
    const openId = (location.state as { openTrainingId?: string } | null)?.openTrainingId;
    if (!openId) return;
    const row = training.find((t) => t.id === openId);
    if (row) setDetailRow(row);
  }, [location.state, training]);

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
    setDetailRow(null);
    await invalidate();
  };

  return (
    <div className="page-grid">
      <div className="card card-wash">
        <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55, margin: 0 }}>
          <strong>Workflow:</strong> Assign → (optional Extend) → Request completion → Manager approves → HR
          approves → Completed. Open <strong>Manage</strong> for status, approvals, and activity.
          {adminBypass && (
            <>
              {" "}
              <strong>Admin:</strong> extend and mark completed skip the approval chain.
            </>
          )}
        </p>
      </div>

      <div className="card-h">
        <span className="tag">Up to 7 unpaid training days per employee</span>
        <div className="row-flex" style={{ gap: 8 }}>
          {canExport && (
            <>
              <button
                type="button"
                className="btn btn-sm"
                disabled={!filtered.length}
                onClick={() => {
                  downloadReportTable(TRAINING_EXPORT_HEADERS, trainingExportRows(filtered), "training", "CSV");
                  fire("CSV exported");
                }}
              >
                Export CSV
              </button>
              <button
                type="button"
                className="btn btn-sm"
                disabled={!filtered.length}
                onClick={() => {
                  downloadReportTable(TRAINING_EXPORT_HEADERS, trainingExportRows(filtered), "training", "Excel");
                  fire("Excel exported");
                }}
              >
                Export Excel
              </button>
              <button
                type="button"
                className="btn btn-sm"
                disabled={!filtered.length}
                onClick={() => {
                  printReportTable(
                    "Training Report",
                    `${filtered.length} record(s)`,
                    TRAINING_EXPORT_HEADERS,
                    trainingExportRows(filtered),
                  );
                }}
              >
                Export PDF
              </button>
            </>
          )}
          {mng && (
            <button type="button" className="btn btn-primary" onClick={() => setAssignOpen(true)}>
              + Assign Training
            </button>
          )}
        </div>
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
          <table style={{ minWidth: 960 }}>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Employee</th>
                <th>Type</th>
                <th>Start</th>
                <th>End</th>
                <th>Extended</th>
                <th>Completion</th>
                <th>Unpaid</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
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
                    <td className="mono">{t.end_date ?? "—"}</td>
                    <td className="mono">{t.extended_end_date ?? "—"}</td>
                    <td className="mono">{t.completion_date ?? "—"}</td>
                    <td style={{ textAlign: "center", color: t.unpaid_days > 0 ? "var(--rose)" : "inherit" }}>
                      {t.unpaid_days}
                    </td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td>
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => setDetailRow(t)}>
                        Manage
                      </button>
                    </td>
                  </tr>
              ))}
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
      {detailRow && !extendRow && !completeRow && (
        <TrainingDetailModal
          row={detailRow}
          canManage={mng}
          adminBypass={adminBypass}
          onClose={() => setDetailRow(null)}
          onExtend={() => setExtendRow(detailRow)}
          onComplete={() => setCompleteRow(detailRow)}
          onRefresh={() => void invalidate()}
          onNotify={(m) => fire(m)}
          onDelete={() => void remove(detailRow)}
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
          adminBypass={adminBypass}
          onClose={() => setCompleteRow(null)}
          onSaved={(m) => {
            fire(m);
            setCompleteRow(null);
            void invalidate();
          }}
        />
      )}
    </div>
  );
}
