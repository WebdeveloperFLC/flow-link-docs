import { useState } from "react";
import { extendTrainingRecord, submitTrainingCompletion } from "../../lib/trainingWorkflow";
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
      await extendTrainingRecord(row, extendedUntil, reason.trim());
      onSaved("Training extended");
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Extension failed");
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
          <> · Currently extended to: <strong>{row.extended_end_date}</strong></>
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
        <span className="l">Extension reason (required)</span>
        <textarea
          className="input"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this training being extended?"
        />
      </label>
      {err && <p style={{ color: "var(--rose)", fontSize: 13 }}>{err}</p>}
    </ModalShell>
  );
}

export function CompleteTrainingModal({
  row,
  adminBypass,
  onClose,
  onSaved,
}: {
  row: TrainingRecordRow;
  adminBypass?: boolean;
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
      await submitTrainingCompletion(row, completionDate, finalReason, {
        bypassApproval: adminBypass,
      });
      onSaved(
        adminBypass
          ? "Training marked completed"
          : "Sent for approval — manager then HR must approve",
      );
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={adminBypass ? "Mark training completed" : "Complete training"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
            {adminBypass ? "Mark completed" : "Submit for approval"}
          </button>
        </>
      }
    >
      <div className="card card-wash" style={{ marginBottom: 12, padding: 12 }}>
        <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          {adminBypass
            ? "As Admin or Super Admin, this completes immediately — no manager or HR approval required."
            : "After you submit, reporting manager approves first, then HR marks the training completed."}
        </p>
      </div>
      {extendedUntil && (
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Planned end: <strong>{extendedUntil}</strong>
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
        <span className="l">Completion reason (required)</span>
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
      {err && <p style={{ color: "var(--rose)", fontSize: 13 }}>{err}</p>}
    </ModalShell>
  );
}
