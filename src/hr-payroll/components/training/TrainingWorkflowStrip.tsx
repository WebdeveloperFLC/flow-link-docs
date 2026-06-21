import { StatusBadge } from "../ui/StatusBadge";
import {
  trainingWorkflowLabel,
  trainingWorkflowStep,
  type TrainingWorkflowStep,
} from "../../lib/trainingWorkflow";

const STEPS: { id: TrainingWorkflowStep; short: string }[] = [
  { id: "active", short: "In progress" },
  { id: "awaiting_manager", short: "Manager" },
  { id: "awaiting_hr", short: "HR" },
  { id: "completed", short: "Done" },
];

function stepIndex(step: TrainingWorkflowStep): number {
  if (step === "rejected" || step === "cancelled") return -1;
  if (step === "active") return 0;
  if (step === "awaiting_manager") return 1;
  if (step === "awaiting_hr") return 2;
  return 3;
}

export function TrainingWorkflowStrip({ status }: { status: string }) {
  const step = trainingWorkflowStep(status);
  const current = stepIndex(step);
  const isTerminalBad = step === "rejected" || step === "cancelled";

  if (isTerminalBad) {
    return (
      <div className="training-workflow-strip">
        <StatusBadge status={status} />
        <span className="muted" style={{ fontSize: 12 }}>{trainingWorkflowLabel(step)}</span>
      </div>
    );
  }

  return (
    <div className="training-workflow-strip">
      <div className="training-workflow-steps">
        {STEPS.map((s, i) => {
          const done = current > i;
          const active = current === i || (step === "completed" && i === 3);
          return (
            <div
              key={s.id}
              className={`training-workflow-step${done ? " done" : ""}${active ? " active" : ""}`}
            >
              <span className="training-workflow-step-num">{i + 1}</span>
              <span className="training-workflow-step-label">{s.short}</span>
            </div>
          );
        })}
      </div>
      <p className="muted training-workflow-hint">{trainingWorkflowLabel(step)}</p>
    </div>
  );
}
