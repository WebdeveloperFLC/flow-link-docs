import { ModalShell } from "../ui/ModalShell";
import { StatusBadge } from "../ui/StatusBadge";
import type { ApprovalRow, EmployeeRow, LeaveRequestRow } from "../../lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  employeeName: string;
  from: string;
  to: string;
  rows: LeaveRequestRow[];
  approvals: ApprovalRow[];
  employees: EmployeeRow[];
};

function approvedByLabel(
  leaveId: string,
  approvals: ApprovalRow[],
  employees: EmployeeRow[],
): string {
  const approved = approvals
    .filter((a) => a.entity_id === leaveId && a.decision === "Approved")
    .sort((a, b) => (a.acted_at ?? "").localeCompare(b.acted_at ?? ""));
  const last = approved[approved.length - 1];
  if (!last?.approver_id) return "—";
  const approver = employees.find((e) => e.id === last.approver_id);
  return approver?.full_name ?? last.approver_id;
}

function remarksLabel(leave: LeaveRequestRow, approvals: ApprovalRow[]): string {
  const approved = approvals
    .filter((a) => a.entity_id === leave.id && a.comment)
    .map((a) => a.comment)
    .filter(Boolean);
  if (approved.length) return approved.join(" · ");
  return leave.reason ?? leave.rejection_reason ?? "—";
}

export function Emp360LeaveHistoryModal({
  open,
  onClose,
  employeeName,
  from,
  to,
  rows,
  approvals,
  employees,
}: Props) {
  if (!open) return null;

  const sorted = [...rows].sort((a, b) => b.from_date.localeCompare(a.from_date));

  return (
    <ModalShell wide title={`Leave history · ${employeeName}`} onClose={onClose}>
      <p className="muted emp360-modal-range">{from} → {to}</p>
      {sorted.length === 0 ? (
        <div className="empty empty-sm">No leave requests in this range.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Leave type</th>
                <th>From</th>
                <th>To</th>
                <th>Total days</th>
                <th>Status</th>
                <th>Approved by</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((l) => (
                <tr key={l.id}>
                  <td>{l.type}</td>
                  <td className="mono">{l.from_date}</td>
                  <td className="mono">{l.to_date}</td>
                  <td className="mono">{l.days}</td>
                  <td><StatusBadge status={l.status} /></td>
                  <td>{approvedByLabel(l.id, approvals, employees)}</td>
                  <td className="muted">{remarksLabel(l, approvals)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ModalShell>
  );
}
