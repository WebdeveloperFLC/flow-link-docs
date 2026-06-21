import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployeeCategories } from "../hooks/useHrEmployeeCategories";
import { ModalShell } from "../components/ui/ModalShell";
import { HR_ORG_ID } from "../lib/constants";
import { hrAudit } from "../lib/hrApi";
import type { HrEmployeeCategoryRow } from "../lib/types";

function CategoryModal({
  row,
  onClose,
  onSaved,
}: {
  row: HrEmployeeCategoryRow | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [label, setLabel] = useState(row?.label ?? "");
  const [leaveEligible, setLeaveEligible] = useState(row?.leave_eligible ?? false);
  const [accrualEligible, setAccrualEligible] = useState(row?.leave_accrual_eligible ?? false);
  const [attendanceRules, setAttendanceRules] = useState(row?.attendance_rules_apply ?? true);
  const [payrollRules, setPayrollRules] = useState(row?.payroll_rules_apply ?? true);
  const [err, setErr] = useState("");

  const save = async () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setErr("Label is required");
      return;
    }
    setErr("");

    const patch = {
      label: trimmed,
      leave_eligible: leaveEligible,
      leave_accrual_eligible: accrualEligible,
      attendance_rules_apply: attendanceRules,
      payroll_rules_apply: payrollRules,
    };

    if (row) {
      const { error } = await supabase
        .from("hr_employee_categories" as never)
        .update(patch as never)
        .eq("id", row.id);
      if (error) {
        onSaved(error.message);
        return;
      }
      await hrAudit("Employee Category Updated", trimmed, row.label, trimmed);
      onSaved("Category updated");
    } else {
      const code = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
      const { data: maxRow } = await supabase
        .from("hr_employee_categories" as never)
        .select("sort_order")
        .eq("org_id", HR_ORG_ID)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const sortOrder = ((maxRow as { sort_order?: number } | null)?.sort_order ?? 0) + 10;

      const { error } = await supabase.from("hr_employee_categories" as never).insert({
        org_id: HR_ORG_ID,
        code: code || "category",
        ...patch,
        sort_order: sortOrder,
        is_active: true,
      } as never);
      if (error) {
        onSaved(error.message);
        return;
      }
      await hrAudit("Employee Category Added", trimmed);
      onSaved("Category added");
    }
    onClose();
  };

  return (
    <ModalShell
      title={row ? "Edit employee category" : "Add employee category"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => void save()}>Save</button>
        </>
      }
    >
      <label className="fld">
        <span className="l">Label</span>
        <input className={`input${err ? " err" : ""}`} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} />
      </label>
      {err && <p className="muted" style={{ fontSize: 12, color: "var(--bad)" }}>{err}</p>}
      <div className="grid" style={{ gap: 10, marginTop: 12 }}>
        <label className="fld" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={leaveEligible} onChange={(e) => setLeaveEligible(e.target.checked)} />
          <span className="l" style={{ margin: 0 }}>Leave eligibility</span>
        </label>
        <label className="fld" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={accrualEligible} onChange={(e) => setAccrualEligible(e.target.checked)} />
          <span className="l" style={{ margin: 0 }}>Leave accrual</span>
        </label>
        <label className="fld" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={attendanceRules} onChange={(e) => setAttendanceRules(e.target.checked)} />
          <span className="l" style={{ margin: 0 }}>Attendance rules apply</span>
        </label>
        <label className="fld" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={payrollRules} onChange={(e) => setPayrollRules(e.target.checked)} />
          <span className="l" style={{ margin: 0 }}>Payroll rules apply</span>
        </label>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        HR-specific employment category — distinct from CRM login roles. Controls leave, accrual, attendance, and payroll rule engines.
      </p>
    </ModalShell>
  );
}

export default function HrEmployeeCategoriesPage() {
  const { can, fire } = useHrAccess();
  const qc = useQueryClient();
  const { data: categories = [], isLoading } = useHrEmployeeCategories(false);
  const [edit, setEdit] = useState<HrEmployeeCategoryRow | "new" | null>(null);
  const mng = can("manageEmp") || can("configure");

  const toggleActive = async (row: HrEmployeeCategoryRow) => {
    const { error } = await supabase
      .from("hr_employee_categories" as never)
      .update({ is_active: !row.is_active } as never)
      .eq("id", row.id);
    if (error) {
      fire(error.message);
      return;
    }
    await hrAudit(row.is_active ? "Category Deactivated" : "Category Activated", row.label);
    void qc.invalidateQueries({ queryKey: ["hr-employee-categories"] });
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Link to="/hr/config" className="btn btn-sm" style={{ alignSelf: "flex-start" }}>← Configuration hub</Link>
      <div className="card">
        <div className="card-h">
          <h3>Employee Category Master</h3>
          <span className="tag">HR Configuration</span>
        </div>
        <p className="muted" style={{ fontSize: 13, padding: "0 20px 12px", lineHeight: 1.5 }}>
          Not the same as CRM user roles. Categories drive leave eligibility, accrual, attendance, and payroll rules per employee.
        </p>
        {mng && (
          <div style={{ padding: "0 20px 12px" }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdit("new")}>
              + Add category
            </button>
          </div>
        )}
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Category</th>
                <th>Leave</th>
                <th>Accrual</th>
                <th>Attendance</th>
                <th>Payroll</th>
                <th>Active</th>
                {mng && <th />}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="muted">Loading…</td></tr>
              )}
              {!isLoading && categories.length === 0 && (
                <tr><td colSpan={7} className="muted">No categories configured.</td></tr>
              )}
              {categories.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.label}</strong><div className="muted" style={{ fontSize: 11 }}>{c.code}</div></td>
                  <td>{c.leave_eligible ? "Yes" : "No"}</td>
                  <td>{c.leave_accrual_eligible ? "Yes" : "No"}</td>
                  <td>{c.attendance_rules_apply ? "Yes" : "No"}</td>
                  <td>{c.payroll_rules_apply ? "Yes" : "No"}</td>
                  <td>{c.is_active ? "Active" : "Inactive"}</td>
                  {mng && (
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button type="button" className="btn btn-sm" onClick={() => setEdit(c)}>Edit</button>
                      <button type="button" className="btn btn-sm" onClick={() => void toggleActive(c)}>
                        {c.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {edit && (
        <CategoryModal
          row={edit === "new" ? null : edit}
          onClose={() => setEdit(null)}
          onSaved={(msg) => {
            fire(msg);
            void qc.invalidateQueries({ queryKey: ["hr-employee-categories"] });
            void qc.invalidateQueries({ queryKey: ["hr-employees"] });
          }}
        />
      )}
    </div>
  );
}
