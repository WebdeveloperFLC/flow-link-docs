import { useMemo, useState } from "react";
import { useHrApprovals } from "../../hooks/useHrRequests";
import { trainingEffectiveEnd } from "../../lib/trainingFilters";
import {
  buildTrainingTimeline,
  decideTrainingCompletion,
  trainingWorkflowStep,
} from "../../lib/trainingWorkflow";
import type { TrainingRecordRow } from "../../lib/types";
import { ModalShell } from "../ui/ModalShell";
import { StatusBadge } from "../ui/StatusBadge";
import { TrainingTimeline } from "./TrainingTimeline";
import { TrainingWorkflowStrip } from "./TrainingWorkflowStrip";

type Props = {
  row: TrainingRecordRow;
  canManage: boolean;
  onClose: () => void;
  onExtend: () => void;
  onComplete: () => void;
  onRefresh: () => void;
  onNotify: (msg: string) => void;
  onDelete: () => void;
};

export function TrainingDetailModal({
  row,
  canManage,
  onClose,
  onExtend,
  onComplete,
  onRefresh,
  onNotify,
  onDelete,
}: Props) {
  const { data: approvals = [] } = useHrApprovals("training", [row.id]);
  const [acting, setActing] = useState(false);
  const [err, setErr] = useState("");

  const step = trainingWorkflowStep(row.status);
  const timeline = useMemo(
    () => buildTrainingTimeline(row, approvals),
    [row, approvals],
  );

  const endDisplay = trainingEffectiveEnd(row) ?? "—";

  const decide = async (decision: "Approved" | "Rejected") => {
    setErr("");
    setActing(true);
    try {
      await decideTrainingCompletion(row, decision);
      onNotify(decision === "Approved" ? "Approval recorded" : "Training completion rejected");
      onRefresh();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setActing(false);
    }
  };

  const showManagerApprove = canManage && step === "awaiting_manager" && approvals.some(
    (a) => a.stage === "Manager" && a.decision === "Pending",
  );
  const showHrApprove =
    canManage &&
    (step === "awaiting_hr" ||
      (step === "awaiting_manager" &&
        !approvals.some((a) => a.stage === "Manager" && a.decision === "Pending") &&
        approvals.some((a) => a.stage === "HR" && a.decision === "Pending")));
  const showExtend = canManage && step === "active";
  const showComplete = canManage && step === "active";
  const showDelete = canManage && step === "active";

  return (
    <ModalShell
      title="Training record"
      onClose={onClose}
      wide
      footer={
        <div className="row-flex" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {showDelete && (
            <button type="button" className="btn btn-sm btn-ghost btn-bad" onClick={onDelete}>
              Delete
            </button>
          )}
          {showExtend && (
            <button type="button" className="btn btn-sm" onClick={onExtend}>
              Extend
            </button>
          )}
          {showComplete && (
            <button type="button" className="btn btn-sm btn-good" onClick={onComplete}>
              Request completion
            </button>
          )}
          {showManagerApprove && (
            <>
              <button
                type="button"
                className="btn btn-sm btn-good"
                disabled={acting}
                onClick={() => void decide("Approved")}
              >
                Manager approve
              </button>
              <button
                type="button"
                className="btn btn-sm btn-bad"
                disabled={acting}
                onClick={() => void decide("Rejected")}
              >
                Reject
              </button>
            </>
          )}
          {showHrApprove && (
            <>
              <button
                type="button"
                className="btn btn-sm btn-good"
                disabled={acting}
                onClick={() => void decide("Approved")}
              >
                HR approve & complete
              </button>
              <button
                type="button"
                className="btn btn-sm btn-bad"
                disabled={acting}
                onClick={() => void decide("Rejected")}
              >
                Reject
              </button>
            </>
          )}
          <button type="button" className="btn btn-sm" onClick={onClose}>Close</button>
        </div>
      }
    >
      <div className="training-detail-grid">
        <div>
          <div className="strong" style={{ fontSize: 16 }}>{row.employees?.full_name ?? "Employee"}</div>
          <div className="muted mono" style={{ fontSize: 12 }}>
            {row.employees?.emp_code} · Ref {row.training_ref ?? row.id.slice(0, 8)}
          </div>
          <div className="row-flex" style={{ gap: 8, marginTop: 8 }}>
            <StatusBadge status={row.status} />
            <span className="tag">{row.type}</span>
          </div>
        </div>
        <div className="training-detail-dates mono" style={{ fontSize: 12.5 }}>
          <div>Start: {row.start_date ?? "—"}</div>
          <div>End: {endDisplay}</div>
          <div>Unpaid days: {row.unpaid_days}</div>
        </div>
      </div>

      <TrainingWorkflowStrip status={row.status} />

      {(showManagerApprove || showHrApprove) && (
        <div className="card card-wash" style={{ marginTop: 12, padding: 10 }}>
          <p style={{ fontSize: 12.5, margin: 0, lineHeight: 1.45 }}>
            {showManagerApprove
              ? "Step 2: Approve as reporting manager, or reject to send back."
              : "Step 3: Final HR approval marks this training completed."}
          </p>
        </div>
      )}

      <h4 style={{ fontSize: 14, margin: "16px 0 8px" }}>Activity</h4>
      <TrainingTimeline events={timeline} />

      {err && <p style={{ color: "var(--rose)", fontSize: 13, marginTop: 12 }}>{err}</p>}
    </ModalShell>
  );
}
