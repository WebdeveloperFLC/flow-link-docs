import { ModalShell } from "../ui/ModalShell";
import { StatusBadge } from "../ui/StatusBadge";
import type { TrainingRecordRow } from "../../lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  employeeName: string;
  from: string;
  to: string;
  rows: TrainingRecordRow[];
};

export function Emp360TrainingHistoryModal({
  open,
  onClose,
  employeeName,
  from,
  to,
  rows,
}: Props) {
  if (!open) return null;

  const sorted = [...rows].sort((a, b) =>
    (b.start_date ?? "").localeCompare(a.start_date ?? ""),
  );

  return (
    <ModalShell wide title={`Training history · ${employeeName}`} onClose={onClose}>
      <p className="muted emp360-modal-range">{from} → {to}</p>
      {sorted.length === 0 ? (
        <div className="empty empty-sm">No training records in this range.</div>
      ) : (
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
      )}
    </ModalShell>
  );
}
