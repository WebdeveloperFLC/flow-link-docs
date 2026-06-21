import { ModalShell } from "../ui/ModalShell";
import { EmployeeDocumentsPanel } from "../employees/EmployeeDocumentsPanel";
import type { EmployeeRow } from "../../lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  employee: EmployeeRow;
};

export function Emp360DocumentsModal({ open, onClose, employee }: Props) {
  if (!open) return null;

  return (
    <ModalShell wide title={`Documents · ${employee.full_name}`} onClose={onClose}>
      <EmployeeDocumentsPanel emp={employee} />
    </ModalShell>
  );
}
