import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useHrEmployees } from "../../hooks/useHrEmployees";
import { useHrMasters } from "../../hooks/useHrMasters";
import { useWpmsAssignments, useWpmsBundles } from "../../hooks/useWpms";
import { assignWpmsBundle, bulkAssignWpmsBundle } from "../../lib/wpmsApi";
import { ModalShell } from "../../components/ui/ModalShell";

export default function WpmsAssignPage() {
  const { can, fire } = useHrAccess();
  const qc = useQueryClient();
  const { data: bundles = [] } = useWpmsBundles();
  const { data: employees = [] } = useHrEmployees();
  const { data: assignments = [] } = useWpmsAssignments();
  const { data: employmentTypes = [] } = useHrMasters("employment_type", true);

  const [bundleId, setBundleId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [branchId, setBranchId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [employmentTypeId, setEmploymentTypeId] = useState("");
  const [preview, setPreview] = useState<{ count: number; employees?: Array<{ emp_code: string; full_name: string }> } | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const canAssign = can("manageEmp") || can("approve");

  const doAssign = async () => {
    if (!employeeId || !bundleId) {
      fire("Select employee and bundle");
      return;
    }
    try {
      await assignWpmsBundle({ employeeId, bundleId, effectiveFrom, reason });
      fire("Bundle assigned");
      void qc.invalidateQueries({ queryKey: ["wpms-assignments"] });
      void qc.invalidateQueries({ queryKey: ["hr-employees"] });
    } catch (e) {
      fire(e instanceof Error ? e.message : "Assign failed");
    }
  };

  const doPreview = async () => {
    if (!bundleId) {
      fire("Select bundle");
      return;
    }
    try {
      const res = await bulkAssignWpmsBundle({
        bundleId,
        effectiveFrom,
        reason,
        branchId: branchId || null,
        departmentId: departmentId || null,
        employmentTypeId: employmentTypeId || null,
        dryRun: true,
      });
      setPreview({ count: res.count, employees: res.employees as Array<{ emp_code: string; full_name: string }> });
      setBulkOpen(true);
    } catch (e) {
      fire(e instanceof Error ? e.message : "Preview failed");
    }
  };

  const doBulkConfirm = async () => {
    try {
      const res = await bulkAssignWpmsBundle({
        bundleId,
        effectiveFrom,
        reason,
        branchId: branchId || null,
        departmentId: departmentId || null,
        employmentTypeId: employmentTypeId || null,
        dryRun: false,
      });
      fire(`Assigned to ${res.count} employees`);
      setBulkOpen(false);
      setPreview(null);
      void qc.invalidateQueries({ queryKey: ["wpms-assignments"] });
    } catch (e) {
      fire(e instanceof Error ? e.message : "Bulk assign failed");
    }
  };

  const branches = [...new Map(employees.filter((e) => e.branch_id).map((e) => [e.branch_id!, e.branches?.name ?? e.branch_id])).entries()];
  const departments = [...new Map(employees.filter((e) => e.department_id).map((e) => [e.department_id!, e.departments?.name ?? e.department_id])).entries()];

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Link to="/hr/admin/wpms" className="btn btn-sm" style={{ alignSelf: "flex-start" }}>← WPMS</Link>

      <div className="card">
        <div className="card-h"><h3>Assign Policy Bundle</h3></div>
        <div className="grid g2" style={{ padding: 20 }}>
          <label className="fld">
            <span className="l">Policy bundle</span>
            <select className="input" value={bundleId} onChange={(e) => setBundleId(e.target.value)}>
              <option value="">— Select bundle —</option>
              {bundles.filter((b) => b.is_active).map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </label>
          <label className="fld">
            <span className="l">Effective from</span>
            <input className="input" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </label>
          <label className="fld">
            <span className="l">Employee (single assign)</span>
            <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">— Select —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.emp_code} — {e.full_name}</option>
              ))}
            </select>
          </label>
          <label className="fld">
            <span className="l">Reason</span>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
          </label>
        </div>
        {canAssign && (
          <div style={{ padding: "0 20px 20px", display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-primary" onClick={() => void doAssign()}>Assign to employee</button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-h"><h3>Bulk assignment</h3></div>
        <div className="grid g3" style={{ padding: 20 }}>
          <label className="fld">
            <span className="l">Branch filter</span>
            <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">All branches</option>
              {branches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label className="fld">
            <span className="l">Department filter</span>
            <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">All departments</option>
              {departments.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label className="fld">
            <span className="l">Employment type</span>
            <select className="input" value={employmentTypeId} onChange={(e) => setEmploymentTypeId(e.target.value)}>
              <option value="">All types</option>
              {employmentTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
        </div>
        {canAssign && (
          <div style={{ padding: "0 20px 20px" }}>
            <button type="button" className="btn" onClick={() => void doPreview()}>Preview bulk assign</button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-h"><h3>Current assignments</h3></div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Employee</th><th>Bundle</th><th>From</th><th>Reason</th><th>By</th></tr></thead>
            <tbody>
              {(assignments as Array<{ id: string; is_current?: boolean; effective_from: string; reason: string | null; assigned_by_label: string | null; employees?: { emp_code: string; full_name: string }; wpms_policy_bundles?: { name: string } }>)
                .filter((a) => a.is_current !== false)
                .slice(0, 50)
                .map((a) => (
                  <tr key={a.id}>
                    <td>{a.employees?.emp_code} — {a.employees?.full_name}</td>
                    <td>{a.wpms_policy_bundles?.name ?? "—"}</td>
                    <td>{a.effective_from}</td>
                    <td>{a.reason ?? "—"}</td>
                    <td>{a.assigned_by_label ?? "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {bulkOpen && preview && (
        <ModalShell
          title={`Bulk assign preview (${preview.count} employees)`}
          onClose={() => setBulkOpen(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setBulkOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={() => void doBulkConfirm()}>Confirm assign</button>
            </>
          }
        >
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Review affected employees before confirming. History rows will be created for each change.</p>
          <div className="tbl-wrap" style={{ maxHeight: 320, overflow: "auto" }}>
            <table className="tbl">
              <thead><tr><th>Code</th><th>Name</th></tr></thead>
              <tbody>
                {(preview.employees ?? []).map((e, i) => (
                  <tr key={i}><td>{e.emp_code}</td><td>{e.full_name}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
