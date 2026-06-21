import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
import { useHrTrainingRecords } from "../hooks/useHrRequests";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ModalShell } from "../components/ui/ModalShell";
import { HR_ORG_ID } from "../lib/constants";
import { hrAudit } from "../lib/hrApi";
import type { TrainingRecordRow } from "../lib/types";

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
    duration: "30 days",
    unpaid_days: 0,
    start_date: "",
  });

  const save = async () => {
    const { error } = await supabase.from("training_records" as never).insert({
      org_id: HR_ORG_ID,
      employee_id: f.employee_id,
      type: f.type,
      duration: f.duration,
      unpaid_days: parseInt(String(f.unpaid_days), 10) || 0,
      start_date: f.start_date || null,
      status: "In Progress",
    } as never);
    if (error) {
      onSaved(error.message);
      return;
    }
    await hrAudit("Training Assigned", f.type);
    onSaved("Training assigned");
    onClose();
  };

  return (
    <ModalShell
      title="Assign Training"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void save()}>
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
            <option key={e.id} value={e.id}>
              {e.full_name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid g2" style={{ gap: "0 16px" }}>
        <label className="fld">
          <span className="l">Type</span>
          <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            {["Paid Training", "Unpaid Training"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="fld">
          <span className="l">Duration</span>
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
          <span className="l">Start Date</span>
          <input
            className="input"
            type="date"
            value={f.start_date}
            onChange={(e) => setF({ ...f, start_date: e.target.value })}
          />
        </label>
      </div>
    </ModalShell>
  );
}

export default function HrTrainingPage() {
  const { can, fire } = useHrAccess();
  const qc = useQueryClient();
  const { data: training = [], isLoading } = useHrTrainingRecords();
  const [open, setOpen] = useState(false);
  const mng = can("approve");

  const update = async (row: TrainingRecordRow, patch: Partial<TrainingRecordRow>) => {
    const { error } = await supabase
      .from("training_records" as never)
      .update(patch as never)
      .eq("id", row.id);
    if (error) {
      fire(error.message);
      return;
    }
    fire("Training updated");
    await qc.invalidateQueries({ queryKey: ["hr-training"] });
  };

  const remove = async (row: TrainingRecordRow) => {
    const { error } = await supabase.from("training_records" as never).delete().eq("id", row.id);
    if (error) {
      fire(error.message);
      return;
    }
    fire("Training removed");
    await qc.invalidateQueries({ queryKey: ["hr-training"] });
  };

  return (
    <div className="page-grid">
      <div className="card-h">
        <span className="tag">Up to 7 unpaid training days · unpaid days reduce payable</span>
        {mng && (
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            + Assign Training
          </button>
        )}
      </div>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        {isLoading ? (
          <div className="empty">Loading…</div>
        ) : training.length === 0 ? (
          <div className="empty">
            <div className="ico">◵</div>
            No training records.
          </div>
        ) : (
          <table style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Employee</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Unpaid Days</th>
                <th>Start</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {training.map((t) => (
                <tr key={t.id}>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {t.id.slice(0, 8)}
                  </td>
                  <td className="strong">{t.employees?.full_name}</td>
                  <td>{t.type}</td>
                  <td>{t.duration}</td>
                  <td style={{ textAlign: "center", color: t.unpaid_days > 0 ? "var(--rose)" : "inherit" }}>
                    {t.unpaid_days}
                  </td>
                  <td>{t.start_date ?? "—"}</td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td>
                    <div className="row-flex">
                      {mng ? (
                        <>
                          {t.status === "In Progress" && (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-good"
                                onClick={() => void update(t, { status: "Completed" })}
                              >
                                Complete
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => {
                                  const days = prompt("Extend by how many days?", "15");
                                  if (days)
                                    void update(t, {
                                      status: "Extended",
                                      duration: `${t.duration} +${days}d`,
                                    });
                                }}
                              >
                                Extend
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost btn-bad"
                            onClick={() => void remove(t)}
                          >
                            ✕
                          </button>
                        </>
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
      <div className="card" style={{ background: "#fff7ed", borderColor: "#fed7aa" }}>
        <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          Management may place an employee on training before confirmation, and may
          increase/decrease/extend it. Up to 7 days can be marked unpaid; unpaid training days are
          deducted from payable days in the engine.
        </div>
      </div>
      {open && (
        <TrainingModal
          onClose={() => setOpen(false)}
          onSaved={(m) => {
            fire(m);
            void qc.invalidateQueries({ queryKey: ["hr-training"] });
          }}
        />
      )}
    </div>
  );
}
