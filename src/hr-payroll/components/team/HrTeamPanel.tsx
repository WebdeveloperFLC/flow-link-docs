import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HR_ROLE_LIST } from "../../context/HrPayrollProvider";
import { useHrReferenceData } from "../../hooks/useHrEmployees";
import { useHrCrmStaff, useHrTeamActions } from "../../hooks/useHrTeam";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { rpcErrorMessage } from "../../lib/hrApi";
import type { CrmStaffRow } from "../../lib/types";
import type { HrRole } from "../../lib/constants";
import { StatusBadge } from "../ui/StatusBadge";

export function HrTeamPanel() {
  const { can, actualCan, fire } = useHrAccess();
  const { data: staff = [], isLoading, error } = useHrCrmStaff();
  const { data: ref } = useHrReferenceData();
  const { assignRole, removeRole, importStaff, syncStaffStatus } = useHrTeamActions();
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const branches = ref?.branches ?? [];
  const editable = actualCan("configure");
  const canImport = can("manageEmp");

  const list = useMemo(() => {
    const s = q.toLowerCase();
    return staff.filter(
      (r) =>
        r.full_name.toLowerCase().includes(s) ||
        (r.email ?? "").toLowerCase().includes(s) ||
        (r.emp_code ?? "").toLowerCase().includes(s) ||
        r.crm_roles.join(" ").toLowerCase().includes(s),
    );
  }, [staff, q]);

  const unlinked = staff.filter((r) => !r.employee_id).length;
  const noHrRole = staff.filter((r) => !r.hr_role).length;

  const setRole = async (row: CrmStaffRow, role: HrRole | "") => {
    setBusyId(row.staff_id);
    try {
      if (!role) {
        await removeRole.mutateAsync(row.staff_id);
        fire(`HR role removed · ${row.full_name}`);
      } else {
        await assignRole.mutateAsync({
          staffId: row.staff_id,
          role,
          scopeBranchId: row.scope_branch_id,
        });
        fire(`${row.full_name} → ${role}`);
      }
    } catch (e) {
      fire(rpcErrorMessage(e, "Update failed"));
    } finally {
      setBusyId(null);
    }
  };

  const setBranchScope = async (row: CrmStaffRow, branchId: string) => {
    if (!row.hr_role) return;
    setBusyId(row.staff_id);
    try {
      await assignRole.mutateAsync({
        staffId: row.staff_id,
        role: row.hr_role,
        scopeBranchId: branchId || null,
      });
      fire(`Branch scope updated · ${row.full_name}`);
    } catch (e) {
      fire(rpcErrorMessage(e, "Scope update failed"));
    } finally {
      setBusyId(null);
    }
  };

  const doImport = async (row: CrmStaffRow) => {
    setBusyId(row.staff_id);
    try {
      await importStaff.mutateAsync(row.staff_id);
      fire(`Imported ${row.full_name} as draft employee`);
    } catch (e) {
      fire(rpcErrorMessage(e, "Import failed"));
    } finally {
      setBusyId(null);
    }
  };

  const doSync = async (row: CrmStaffRow) => {
    setBusyId(row.staff_id);
    try {
      await syncStaffStatus.mutateAsync(row.staff_id);
      fire(`Synced CRM status · ${row.full_name}`);
    } catch (e) {
      fire(rpcErrorMessage(e, "Sync failed"));
    } finally {
      setBusyId(null);
    }
  };

  if (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const needsGrant = /permission denied|42501/i.test(msg);
    const needsMigration = /does not exist|42883/i.test(msg);
    return (
      <div className="card" style={{ background: "#fff7ed", borderColor: "#fed7aa" }}>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.55 }}>
          <strong>Team list unavailable.</strong>
          {needsGrant && (
            <>
              {" "}
              Run SQL fix:{" "}
              <span className="mono">docs/hr-payroll/HR_PAYROLL_FIX_TEAM_CRM_GRANTS.sql</span> or migration{" "}
              <span className="mono">20260717120025</span>.
            </>
          )}
          {needsMigration && (
            <>
              {" "}
              Apply migrations{" "}
              <span className="mono">20260717120009</span> and{" "}
              <span className="mono">20260717120024</span>.
            </>
          )}
          {!needsGrant && !needsMigration && (
            <> Check migrations 09 / 24 / 25 or ask your lead.</>
          )}
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--mut)" }}>{msg}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg,#eef5ff,#f0fff4)",
          borderColor: "#cfe1f7",
        }}
      >
        <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.55 }}>
          <strong>Phase 8 — CRM Team &amp; Roles.</strong> CRM logins live in{" "}
          <Link to="/users" style={{ color: "var(--moss)" }}>
            Admin → Team &amp; roles
          </Link>
          . Assign <em>HR module roles</em> here; link or import staff into Employee Master.
          Pull model — no auto-create on CRM invite.
        </div>
      </div>

      <div className="grid g3">
        <div className="card">
          <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 }}>
            CRM staff
          </div>
          <div className="serif" style={{ fontSize: 22, fontWeight: 600 }}>
            {staff.length}
          </div>
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 }}>
            No employee record
          </div>
          <div className="serif" style={{ fontSize: 22, fontWeight: 600, color: unlinked ? "var(--clay)" : "inherit" }}>
            {unlinked}
          </div>
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 }}>
            No HR role
          </div>
          <div className="serif" style={{ fontSize: 22, fontWeight: 600, color: noHrRole ? "var(--clay)" : "inherit" }}>
            {noHrRole}
          </div>
        </div>
      </div>

      <div className="card-h">
        <input
          className="input"
          style={{ maxWidth: 320 }}
          placeholder="Search name, email, CRM role…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        {isLoading ? (
          <div className="empty">Loading CRM staff…</div>
        ) : list.length === 0 ? (
          <div className="empty">No staff match.</div>
        ) : (
          <table style={{ minWidth: 980 }}>
            <thead>
              <tr>
                <th>CRM user</th>
                <th>CRM roles</th>
                <th>HR role</th>
                <th>Branch scope</th>
                <th>Employee</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => {
                const loading = busyId === row.staff_id;
                return (
                  <tr key={row.staff_id}>
                    <td>
                      <div className="strong">{row.full_name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {row.email ?? "—"}
                      </div>
                      {row.profile_status !== "active" && (
                        <span className="tag" style={{ marginTop: 4 }}>
                          {row.profile_status}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="row-flex">
                        {row.crm_roles.length ? (
                          row.crm_roles.map((r) => (
                            <span key={r} className="tag">
                              {r}
                            </span>
                          ))
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <select
                        className="input"
                        style={{ minWidth: 140, fontSize: 12 }}
                        value={row.hr_role ?? ""}
                        disabled={!editable || loading}
                        onChange={(e) =>
                          void setRole(row, e.target.value as HrRole | "")
                        }
                      >
                        <option value="">— none —</option>
                        {HR_ROLE_LIST.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="input"
                        style={{ minWidth: 120, fontSize: 12 }}
                        value={row.scope_branch_id ?? ""}
                        disabled={!editable || !row.hr_role || loading}
                        onChange={(e) => void setBranchScope(row, e.target.value)}
                      >
                        <option value="">All branches</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                      {!row.scope_branch_id && row.branch_name && (
                        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                          Profile: {row.branch_name}
                        </div>
                      )}
                    </td>
                    <td>
                      {row.employee_id ? (
                        <>
                          <Link
                            to={`/hr/employee/${row.employee_id}`}
                            className="strong"
                            style={{ color: "var(--moss)" }}
                          >
                            {row.emp_code}
                          </Link>
                          <div style={{ fontSize: 12 }}>{row.employee_name}</div>
                        </>
                      ) : (
                        <span className="muted">Not linked</span>
                      )}
                    </td>
                    <td>
                      <div className="row-flex">
                        {canImport && !row.employee_id && (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={loading}
                            onClick={() => void doImport(row)}
                          >
                            Import
                          </button>
                        )}
                        {canImport && row.employee_id && (
                          <button
                            type="button"
                            className="btn btn-sm"
                            disabled={loading}
                            onClick={() => void doSync(row)}
                          >
                            Sync status
                          </button>
                        )}
                        {row.hr_role && (
                          <StatusBadge status="Approved" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
