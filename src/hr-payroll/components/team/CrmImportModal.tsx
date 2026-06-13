import { useMemo } from "react";
import { useHrCrmStaff, useHrTeamActions } from "../../hooks/useHrTeam";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { ModalShell } from "../ui/ModalShell";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CrmImportModal({ open, onClose }: Props) {
  const { fire } = useHrAccess();
  const { data: staff = [], isLoading } = useHrCrmStaff();
  const { importStaff } = useHrTeamActions();

  const unlinked = useMemo(
    () => staff.filter((s) => !s.employee_id),
    [staff],
  );

  const doImport = async (staffId: string, name: string) => {
    try {
      await importStaff.mutateAsync(staffId);
      fire(`Imported ${name} as draft employee`);
    } catch (e) {
      fire(e instanceof Error ? e.message : "Import failed");
    }
  };

  if (!open) return null;

  return (
    <ModalShell title="Import from CRM" onClose={onClose} wide>
      <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 14 }}>
        Creates a draft employee from the CRM profile (name, email, branch). Assign salary
        and complete the profile in Employee Master afterward.
      </div>
      {isLoading ? (
        <div className="empty">Loading CRM users…</div>
      ) : unlinked.length === 0 ? (
        <div className="empty">
          <div className="ico">✓</div>
          All CRM staff already have employee records.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>CRM roles</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {unlinked.map((r) => (
              <tr key={r.staff_id}>
                <td className="strong">{r.full_name}</td>
                <td>{r.email ?? "—"}</td>
                <td>
                  {r.crm_roles.length ? r.crm_roles.join(", ") : "—"}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={importStaff.isPending}
                    onClick={() => void doImport(r.staff_id, r.full_name)}
                  >
                    Import
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ModalShell>
  );
}
