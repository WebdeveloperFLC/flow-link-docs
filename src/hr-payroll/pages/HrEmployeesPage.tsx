import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees, useHrReferenceData } from "../hooks/useHrEmployees";
import {
  employeeStatusBadgeClass,
  employeeStatusLabel,
  formatMoney,
  employeeCurrency,
  initials,
  isEmployeeInactive,
} from "../lib/format";
import { employeeMatchesContactSearch } from "../lib/employeeContact";
import { deactivateEmployee } from "../lib/hrApi";
import type { EmployeeRow } from "../lib/types";
import { EmployeeFormModal } from "../components/employees/EmployeeFormModal";
import { EmployeeDetailModal } from "../components/employees/EmployeeDetailModal";
import { CrmImportModal } from "../components/team/CrmImportModal";

const DEACTIVATE_CONFIRM =
  "This employee will be marked inactive. Historical payroll, attendance, leave and documents will be preserved.";

export default function HrEmployeesPage() {
  const { can, fire, dbReady } = useHrAccess();
  const [showInactive, setShowInactive] = useState(false);
  const { data: employees = [], isLoading, error } = useHrEmployees({ activeOnly: !showInactive });
  const { data: ref } = useHrReferenceData();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<EmployeeRow | "new" | null>(null);
  const [detail, setDetail] = useState<EmployeeRow | null>(null);
  const [crmImport, setCrmImport] = useState(false);

  const list = useMemo(() => {
    return employees.filter((e) => employeeMatchesContactSearch(e, q));
  }, [employees, q]);

  const deactivate = async (e: EmployeeRow) => {
    if (isEmployeeInactive(e.status)) return;
    if (!confirm(`${DEACTIVATE_CONFIRM}\n\nDeactivate ${e.full_name} (${e.emp_code})?`)) return;
    try {
      await deactivateEmployee(e.id, e.full_name, e.status);
      fire("Employee deactivated");
      await qc.invalidateQueries({ queryKey: ["hr-employees"] });
      await qc.invalidateQueries({ queryKey: ["hr-shift-counts"] });
      await qc.invalidateQueries({ queryKey: ["hr-dashboard-stats"] });
    } catch (err) {
      fire(err instanceof Error ? err.message : "Deactivate failed");
    }
  };

  if (!dbReady && error) {
    return (
      <div className="card" style={{ background: "#fff7ed", borderColor: "#fed7aa" }}>
        <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          HR database not ready. Apply SQL migrations in order (schema → RLS → functions → seed).
        </div>
      </div>
    );
  }

  return (
    <div className="page-grid">
      <div className="card-h">
        <div className="row-flex" style={{ gap: 12, flex: 1 }}>
          <input
            className="input"
            style={{ maxWidth: 300 }}
            placeholder="Search name, ID, personal/company email or mobile…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <label className="row-flex muted" style={{ fontSize: 12.5, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive employees
          </label>
        </div>
        {can("manageEmp") && (
          <div className="row-flex">
            <Link to="/hr/config" className="btn">
              Configuration
            </Link>
            <button type="button" className="btn" onClick={() => setCrmImport(true)}>
              Import from CRM
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setEdit("new")}>
              + Add Employee
            </button>
          </div>
        )}
      </div>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        {isLoading ? (
          <div className="empty">Loading…</div>
        ) : list.length === 0 ? (
          <div className="empty">
            <div className="ico">⊞</div>
            No employees match.
          </div>
        ) : (
          <table style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Contact</th>
                <th>Dept</th>
                <th>Designation</th>
                <th>Branch</th>
                <th>Category</th>
                <th>Monthly</th>
                <th>Bank</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td className="strong">
                    <div className="row-flex">
                      <div className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                        {initials(e.full_name)}
                      </div>
                      <div>
                        {e.full_name}
                        <div className="muted mono" style={{ fontSize: 11 }}>
                          {e.emp_code}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 11.5 }}>
                    {e.mobile || "—"}
                    <div className="muted">{e.email || ""}</div>
                    {(e.company_mobile || e.company_email) && (
                      <div className="muted" style={{ fontSize: 10.5 }}>
                        Co: {e.company_mobile || "—"} {e.company_email ? `· ${e.company_email}` : ""}
                      </div>
                    )}
                  </td>
                  <td>{e.departments?.name ?? e.department ?? "—"}</td>
                  <td>{e.designations?.name ?? e.designation ?? "—"}</td>
                  <td>{e.branches?.name ?? "—"}</td>
                  <td style={{ fontSize: 12 }}>{e.hr_employee_categories?.label ?? "—"}</td>
                  <td className="mono">{formatMoney(e.monthly_gross, employeeCurrency(e))}</td>
                  <td>
                    {e.bank_account_number ? (
                      e.bank_verified ? (
                        <span className="badge b-approved">Verified</span>
                      ) : (
                        <span className="badge b-pending">Pending</span>
                      )
                    ) : (
                      <span className="badge b-pending">Missing</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${employeeStatusBadgeClass(e.status)}`}>
                      {employeeStatusLabel(e.status)}
                    </span>
                  </td>
                  <td>
                    <div className="row-flex">
                      <button type="button" className="btn btn-sm" onClick={() => setDetail(e)}>
                        View
                      </button>
                      {can("manageEmp") && (
                        <>
                          <button type="button" className="btn btn-sm" onClick={() => setEdit(e)}>
                            Edit
                          </button>
                          {!isEmployeeInactive(e.status) && (
                            <button
                              type="button"
                              className="btn btn-sm btn-bad"
                              onClick={() => void deactivate(e)}
                            >
                              Deactivate
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {edit && ref && (
        <EmployeeFormModal
          key={edit === "new" ? "new" : edit.id}
          emp={edit === "new" ? null : edit}
          companies={ref.companies}
          branches={ref.branches}
          departments={ref.departments}
          designations={ref.designations}
          categories={ref.categories}
          shifts={ref.shifts}
          onClose={() => setEdit(null)}
        />
      )}
      {detail && <EmployeeDetailModal emp={detail} onClose={() => setDetail(null)} />}
      <CrmImportModal open={crmImport} onClose={() => setCrmImport(false)} />
    </div>
  );
}
