import { formatTrainingAuditWhen } from "../../lib/trainingFilters";
import type { TrainingTimelineEvent } from "../../lib/trainingWorkflow";

export function TrainingTimeline({ events }: { events: TrainingTimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="muted" style={{ fontSize: 13 }}>No activity recorded yet.</p>;
  }

  return (
    <ul className="training-timeline">
      {events.map((e) => (
        <li key={e.key} className="training-timeline-item">
          <div className="training-timeline-dot" />
          <div className="training-timeline-body">
            <div className="strong" style={{ fontSize: 13 }}>{e.label}</div>
            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.45 }}>{e.detail}</div>
            {e.when && (
              <div className="muted mono" style={{ fontSize: 11, marginTop: 2 }}>
                {formatTrainingAuditWhen(e.when)}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
