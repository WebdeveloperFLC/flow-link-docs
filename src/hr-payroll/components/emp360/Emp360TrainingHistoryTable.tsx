import { StatusBadge } from "../../components/ui/StatusBadge";
import type { TrainingRecordRow } from "../../lib/types";

type Props = {
  rows: TrainingRecordRow[];
};

export function Emp360TrainingHistoryTable({ rows }: Props) {
  const sorted = [...rows].sort((a, b) =>
    (b.start_date ?? "").localeCompare(a.start_date ?? ""),
  );

  if (sorted.length === 0) {
    return <div className="empty empty-sm">No training records in this range.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Start date</th>
            <th>Duration</th>
            <th>Unpaid days</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => (
            <tr key={t.id}>
              <td>{t.type}</td>
              <td className="mono">{t.start_date ?? "—"}</td>
              <td>{t.duration ?? "—"}</td>
              <td className="mono">{t.unpaid_days}</td>
              <td><StatusBadge status={t.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
