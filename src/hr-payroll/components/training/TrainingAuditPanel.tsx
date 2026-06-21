import { useTrainingExtensionHistory } from "../../hooks/useHrRequests";
import { formatTrainingAuditWhen } from "../../lib/trainingFilters";
import type { TrainingRecordRow } from "../../lib/types";

export function TrainingAuditPanel({ row }: { row: TrainingRecordRow }) {
  const { data: history = [] } = useTrainingExtensionHistory(row.id);

  const rows: Array<{ label: string; value: string }> = [
    { label: "Created by", value: row.created_by_label ?? "—" },
    { label: "Created on", value: formatTrainingAuditWhen(row.created_at) },
    { label: "Original end date", value: row.original_end_date ?? row.end_date ?? "—" },
    { label: "Extended end date", value: row.extended_end_date ?? "—" },
    { label: "Extension reason", value: row.extension_reason ?? "—" },
    { label: "Extended by", value: row.extended_by_label ?? "—" },
    { label: "Extended on", value: formatTrainingAuditWhen(row.extended_at) },
    { label: "Completion requested by", value: row.completion_requested_by_label ?? "—" },
    { label: "Completion reason", value: row.completion_reason ?? "—" },
    { label: "Completion date", value: row.completion_date ?? "—" },
    { label: "Requested on", value: formatTrainingAuditWhen(row.completion_requested_at) },
    { label: "Approved by manager", value: row.manager_approved_by_label ?? "—" },
    { label: "Manager approved on", value: formatTrainingAuditWhen(row.manager_approved_at) },
    { label: "Approved by HR", value: row.hr_approved_by_label ?? "—" },
    { label: "HR approved on", value: formatTrainingAuditWhen(row.hr_approved_at) },
  ];

  return (
    <div className="training-audit-panel">
      <h4 style={{ fontSize: 14, margin: "0 0 10px" }}>Audit trail</h4>
      <div className="info-grid">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="info-field-label">{r.label}</div>
            <div className="info-field-value">{r.value}</div>
          </div>
        ))}
      </div>
      {history.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: 13, marginBottom: 8 }}>Extension history</h4>
          <table style={{ width: "100%", fontSize: 12.5 }}>
            <thead>
              <tr>
                <th>From</th>
                <th>Extended until</th>
                <th>Reason</th>
                <th>By</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="mono">{h.original_end_date ?? "—"}</td>
                  <td className="mono">{h.extended_end_date}</td>
                  <td>{h.extension_reason}</td>
                  <td>{h.extended_by_label ?? "—"}</td>
                  <td className="muted">{formatTrainingAuditWhen(h.extended_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
