import { useState } from "react";
import { extendTraining, requestTrainingCompletion } from "../../lib/hrApi";
import { ModalShell } from "../ui/ModalShell";
import { TRAINING_COMPLETION_REASONS } from "../../lib/trainingFilters";
import type { TrainingRecordRow } from "../../lib/types";
import { trainingEffectiveEnd } from "../../lib/trainingFilters";

export function ExtendTrainingModal({
  row,
  onClose,
  onSaved,
}: {
  row: TrainingRecordRow;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const currentEnd = trainingEffectiveEnd(row) ?? row.start_date ?? "";
  const [extendedUntil, setExtendedUntil] = useState(currentEnd);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!extendedUntil) {
      setErr("Extended until date is required");
      return;
    }
    if (!reason.trim()) {
      setErr("Extension reason is required");
      return;
    }
    setErr("");
    setSaving(true);
    try {
      await extendTraining(row.id, extendedUntil, reason.trim());
      onSaved("Training extended");
      onClose();
    } catch (e) {
      onSaved(e instanceof Error ? e.message : "Extension failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Extend training"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
            Save extension
          </button>
        </>
      }
    >
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        Original end: <strong>{row.end_date ?? "—"}</strong>
        {row.extended_end_date && (
          <> · Current extended until: <strong>{row.extended_end_date}</strong></>
        )}
      </p>
      <label className="fld">
        <span className="l">Extended until date</span>
        <input
          type="date"
          className="input"
          value={extendedUntil}
          onChange={(e) => setExtendedUntil(e.target.value)}
        />
      </label>
      <label className="fld">
        <span className="l">Extension reason</span>
        <textarea
          className="input"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Required — reason for extension"
        />
      </label>
      {err && <p style={{ color: "var(--rose)", fontSize: 13 }}>{err}</p>}
    </ModalShell>
  );
}

export function CompleteTrainingModal({
  row,
  onClose,
  onSaved,
}: {
  row: TrainingRecordRow;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [completionDate, setCompletionDate] = useState(today);
  const [reason, setReason] = useState(TRAINING_COMPLETION_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const extendedUntil = trainingEffectiveEnd(row);

  const save = async () => {
    const finalReason = reason === "Other" ? customReason.trim() : reason;
    if (!completionDate) {
      setErr("Completion date is required");
      return;
    }
    if (!finalReason) {
      setErr("Completion reason is required");
      return;
    }
    setErr("");
    setSaving(true);
    try {
      await requestTrainingCompletion(row.id, completionDate, finalReason);
      onSaved("Completion submitted for approval");
      onClose();
    } catch (e) {
      onSaved(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Request training completion"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
            Submit for approval
          </button>
        </>
      }
    >
      {extendedUntil && (
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Extended until <strong>{extendedUntil}</strong> — you can complete earlier (e.g. before extension date).
        </p>
      )}
      <label className="fld">
        <span className="l">Completion date</span>
        <input
          type="date"
          className="input"
          value={completionDate}
          onChange={(e) => setCompletionDate(e.target.value)}
        />
      </label>
      <label className="fld">
        <span className="l">Completion reason</span>
        <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
          {TRAINING_COMPLETION_REASONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </label>
      {reason === "Other" && (
        <label className="fld">
          <span className="l">Specify reason</span>
          <textarea
            className="input"
            rows={2}
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
          />
        </label>
      )}
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        Workflow: Reporting Manager → HR → Completed
      </p>
      {err && <p style={{ color: "var(--rose)", fontSize: 13 }}>{err}</p>}
    </ModalShell>
  );
}
