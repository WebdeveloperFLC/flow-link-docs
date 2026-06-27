import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useWpmsBundles, useWpmsPolicies } from "../../hooks/useWpms";
import { saveWpmsBundle } from "../../lib/wpmsApi";
import { WPMS_POLICY_KINDS, type WpmsBundleRow } from "../../lib/wpmsTypes";
import { ModalShell } from "../../components/ui/ModalShell";

function BundleModal({
  row,
  onClose,
  onSaved,
}: {
  row: WpmsBundleRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: policies = [] } = useWpmsPolicies();
  const [name, setName] = useState(row?.name ?? "");
  const [code, setCode] = useState(row?.code ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [version, setVersion] = useState(row?.version ?? 1);
  const [effectiveFrom, setEffectiveFrom] = useState(row?.effective_from ?? new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(row?.notes ?? "");
  const [attendancePolicyId, setAttendancePolicyId] = useState(row?.attendance_policy_id ?? "");
  const [leavePolicyId, setLeavePolicyId] = useState(row?.leave_policy_id ?? "");
  const [payrollPolicyId, setPayrollPolicyId] = useState(row?.payroll_policy_id ?? "");
  const [salaryTemplateId, setSalaryTemplateId] = useState(row?.salary_template_id ?? "");
  const [bonusPolicyId, setBonusPolicyId] = useState(row?.bonus_policy_id ?? "");
  const [holidayCalendarId, setHolidayCalendarId] = useState(row?.holiday_calendar_id ?? "");

  const byKind = (kind: string) => policies.filter((p) => p.policy_kind === kind && p.is_active);

  const save = async () => {
    await saveWpmsBundle(
      {
        name: name.trim(),
        code: code.trim(),
        description: description || null,
        version,
        effective_from: effectiveFrom,
        notes: notes || null,
        attendance_policy_id: attendancePolicyId || null,
        leave_policy_id: leavePolicyId || null,
        payroll_policy_id: payrollPolicyId || null,
        salary_template_id: salaryTemplateId || null,
        bonus_policy_id: bonusPolicyId || null,
        holiday_calendar_id: holidayCalendarId || null,
        is_active: true,
      },
      row,
    );
    onSaved();
  };

  const policySelect = (label: string, kind: string, value: string, set: (v: string) => void) => (
    <label className="fld" key={kind}>
      <span className="l">{label}</span>
      <select className="input" value={value} onChange={(e) => set(e.target.value)}>
        <option value="">— Select —</option>
        {byKind(kind).map((p) => (
          <option key={p.id} value={p.id}>{p.name} (v{p.version})</option>
        ))}
      </select>
    </label>
  );

  return (
    <ModalShell
      title={row ? "Edit policy bundle" : "New policy bundle"}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => void save()}>Save</button>
        </>
      }
    >
      <div className="grid g2">
        <label className="fld"><span className="l">Name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="fld"><span className="l">Code</span><input className="input" value={code} onChange={(e) => setCode(e.target.value)} disabled={!!row} /></label>
        <label className="fld"><span className="l">Version</span><input className="input" type="number" value={version} onChange={(e) => setVersion(Number(e.target.value))} /></label>
        <label className="fld"><span className="l">Effective from</span><input className="input" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} /></label>
      </div>
      <label className="fld"><span className="l">Description</span><textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <label className="fld"><span className="l">Notes</span><textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      <div className="grid g2" style={{ marginTop: 8 }}>
        {policySelect("Attendance policy", "attendance", attendancePolicyId, setAttendancePolicyId)}
        {policySelect("Leave policy", "leave", leavePolicyId, setLeavePolicyId)}
        {policySelect("Payroll policy", "payroll", payrollPolicyId, setPayrollPolicyId)}
        {policySelect("Salary template", "salary_template", salaryTemplateId, setSalaryTemplateId)}
        {policySelect("Bonus policy", "bonus", bonusPolicyId, setBonusPolicyId)}
        {policySelect("Holiday calendar", "holiday_calendar", holidayCalendarId, setHolidayCalendarId)}
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>Kinds: {WPMS_POLICY_KINDS.map((k) => k.label).join(", ")}</p>
    </ModalShell>
  );
}

export default function WpmsBundlesPage() {
  const { can, fire } = useHrAccess();
  const qc = useQueryClient();
  const { data: bundles = [], isLoading } = useWpmsBundles();
  const [edit, setEdit] = useState<WpmsBundleRow | "new" | null>(null);
  const canWrite = can("configure");

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Link to="/hr/admin/wpms" className="btn btn-sm" style={{ alignSelf: "flex-start" }}>← WPMS</Link>
      <div className="card">
        <div className="card-h"><h3>Policy Bundles</h3></div>
        {canWrite && (
          <div style={{ padding: "0 20px 12px" }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdit("new")}>+ New bundle</button>
          </div>
        )}
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Code</th><th>Ver</th><th>Effective</th><th>Active</th>{canWrite && <th />}</tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="muted">Loading…</td></tr>}
              {bundles.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.name}</strong><div className="muted" style={{ fontSize: 11 }}>{b.description ?? ""}</div></td>
                  <td>{b.code}</td>
                  <td>{b.version}</td>
                  <td>{b.effective_from}</td>
                  <td>{b.is_active ? "Yes" : "No"}</td>
                  {canWrite && <td><button type="button" className="btn btn-sm" onClick={() => setEdit(b)}>Edit</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {edit && (
        <BundleModal
          row={edit === "new" ? null : edit}
          onClose={() => setEdit(null)}
          onSaved={() => {
            fire("Bundle saved");
            setEdit(null);
            void qc.invalidateQueries({ queryKey: ["wpms-bundles"] });
          }}
        />
      )}
    </div>
  );
}
