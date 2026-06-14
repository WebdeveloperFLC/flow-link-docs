import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID, DEPARTMENTS, MANAGERS } from "../../lib/constants";
import { fillSalaryComponents, inr } from "../../lib/format";
import { uploadEmployeePhoto } from "../../lib/hrStorage";
import { EmployeeAvatar } from "../ui/EmployeeAvatar";
import type { BranchRow, CompanyRow, EmployeeRow, ShiftRow } from "../../lib/types";
import { fetchNextEmpCode } from "../../hooks/useHrEmployees";
import { useHrCrmStaff } from "../../hooks/useHrTeam";
import { useHrAccess } from "../../context/HrPayrollProvider";

type FormTab = "basic" | "employment" | "shift" | "salary" | "statutory" | "bank";

type Props = {
  emp: EmployeeRow | null;
  companies: CompanyRow[];
  branches: BranchRow[];
  shifts: ShiftRow[];
  onClose: () => void;
};

type FormState = {
  full_name: string;
  gender: string;
  dob: string;
  mobile: string;
  email: string;
  addr_current: string;
  addr_permanent: string;
  emergency: string;
  designation: string;
  department: string;
  branch_id: string;
  company_id: string;
  employment_type: string;
  date_of_joining: string;
  notice_period: string;
  work_week: string;
  status: string;
  shift_id: string;
  monthly_gross: number | "";
  basic: number | "";
  hra: number | "";
  conveyance: number | "";
  special_allow: number | "";
  incentive: number | "";
  bonus: number | "";
  pf_applicable: boolean;
  pf_number: string;
  uan: string;
  esic_applicable: boolean;
  esic_number: string;
  bank_holder_name: string;
  bank_name: string;
  bank_account_number: string;
  bank_ifsc: string;
  bank_branch: string;
  bank_account_type: string;
  bank_verified: boolean;
  staff_id: string;
};

function fromEmployee(e: EmployeeRow): FormState {
  return {
    full_name: e.full_name,
    gender: e.gender ?? "Female",
    dob: e.dob ?? "",
    mobile: e.mobile ?? "",
    email: e.email ?? "",
    addr_current: e.addr_current ?? "",
    addr_permanent: e.addr_permanent ?? "",
    emergency: e.emergency ?? "",
    designation: e.designation ?? "",
    department: e.department ?? "Counselling",
    branch_id: e.branch_id ?? "",
    company_id: e.company_id ?? "",
    employment_type: e.employment_type,
    date_of_joining: e.date_of_joining ?? "",
    notice_period: e.notice_period ?? "30 days",
    work_week: e.work_week,
    status: e.status,
    shift_id: e.shift_id ?? "",
    monthly_gross: e.monthly_gross,
    basic: e.basic,
    hra: e.hra,
    conveyance: e.conveyance,
    special_allow: e.special_allow,
    incentive: e.incentive,
    bonus: e.bonus,
    pf_applicable: e.pf_applicable,
    pf_number: e.pf_number ?? "",
    uan: e.uan ?? "",
    esic_applicable: e.esic_applicable,
    esic_number: e.esic_number ?? "",
    bank_holder_name: e.bank_holder_name ?? "",
    bank_name: e.bank_name ?? "",
    bank_account_number: e.bank_account_number ?? "",
    bank_ifsc: e.bank_ifsc ?? "",
    bank_branch: e.bank_branch ?? "",
    bank_account_type: e.bank_account_type ?? "Savings",
    bank_verified: e.bank_verified,
    staff_id: e.staff_id ?? "",
  };
}

const blank = (shifts: ShiftRow[], companies: CompanyRow[], branches: BranchRow[]): FormState => ({
  full_name: "",
  gender: "Female",
  dob: "",
  mobile: "",
  email: "",
  addr_current: "",
  addr_permanent: "",
  emergency: "",
  designation: "",
  department: "Counselling",
  branch_id: branches[0]?.id ?? "",
  company_id: companies[0]?.id ?? "",
  employment_type: "Full-Time",
  date_of_joining: "",
  notice_period: "30 days",
  work_week: "6-Day",
  status: "On Probation",
  shift_id: shifts[0]?.id ?? "",
  monthly_gross: "",
  basic: "",
  hra: "",
  conveyance: "",
  special_allow: "",
  incentive: 0,
  bonus: 0,
  pf_applicable: true,
  pf_number: "",
  uan: "",
  esic_applicable: false,
  esic_number: "",
  bank_holder_name: "",
  bank_name: "",
  bank_account_number: "",
  bank_ifsc: "",
  bank_branch: "",
  bank_account_type: "Savings",
  bank_verified: false,
  staff_id: "",
});

export function EmployeeFormModal({ emp, companies, branches, shifts, onClose }: Props) {
  const { fire } = useHrAccess();
  const qc = useQueryClient();
  const { data: crmStaff = [] } = useHrCrmStaff();
  const [tab, setTab] = useState<FormTab>("basic");
  const [f, setF] = useState<FormState>(
    emp ? fromEmployee(emp) : blank(shifts, companies, branches),
  );
  const [err, setErr] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const fillComponents = (m: string) => {
    const mm = parseFloat(m) || 0;
    const c = fillSalaryComponents(mm);
    setF((fp) => ({
      ...fp,
      monthly_gross: m === "" ? "" : mm,
      basic: c.basic,
      hra: c.hra,
      conveyance: c.conveyance,
      special_allow: c.special_allow,
    }));
  };

  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.full_name.trim()) e.name = "Name required";
    if (!f.designation.trim()) e.desig = "Designation required";
    if (!f.monthly_gross || Number(f.monthly_gross) <= 0) e.monthly = "Valid monthly salary required";
    setErr(e);
    if (Object.keys(e).length) {
      setTab(e.name || e.desig ? "basic" : "salary");
      return;
    }

    setSaving(true);
    const payload = {
      org_id: HR_ORG_ID,
      full_name: f.full_name.trim(),
      gender: f.gender,
      dob: f.dob || null,
      mobile: f.mobile || null,
      email: f.email || null,
      addr_current: f.addr_current || null,
      addr_permanent: f.addr_permanent || null,
      emergency: f.emergency || null,
      designation: f.designation.trim(),
      department: f.department,
      branch_id: f.branch_id || null,
      company_id: f.company_id || null,
      employment_type: f.employment_type,
      date_of_joining: f.date_of_joining || null,
      notice_period: f.notice_period,
      work_week: f.work_week,
      status: f.status,
      shift_id: f.shift_id || null,
      monthly_gross: Number(f.monthly_gross),
      basic: Number(f.basic) || 0,
      hra: Number(f.hra) || 0,
      conveyance: Number(f.conveyance) || 0,
      special_allow: Number(f.special_allow) || 0,
      incentive: Number(f.incentive) || 0,
      bonus: Number(f.bonus) || 0,
      pf_applicable: f.pf_applicable,
      pf_number: f.pf_number || null,
      uan: f.uan || null,
      esic_applicable: f.esic_applicable,
      esic_number: f.esic_number || null,
      bank_holder_name: f.bank_holder_name || null,
      bank_name: f.bank_name || null,
      bank_account_number: f.bank_account_number || null,
      bank_ifsc: f.bank_ifsc || null,
      bank_branch: f.bank_branch || null,
      bank_account_type: f.bank_account_type || "Savings",
      bank_verified: f.bank_verified,
      staff_id: f.staff_id || null,
    };

    try {
      let employeeId = emp?.id;
      if (emp) {
        const { error } = await supabase
          .from("employees" as never)
          .update(payload as never)
          .eq("id", emp.id);
        if (error) throw error;
        employeeId = emp.id;
        fire("Employee updated");
      } else {
        const emp_code = await fetchNextEmpCode();
        const { data, error } = await supabase
          .from("employees" as never)
          .insert({ ...payload, emp_code } as never)
          .select("id")
          .single();
        if (error) throw error;
        employeeId = (data as { id: string }).id;
        fire(`Employee ${f.full_name} added`);
      }
      if (photoFile && employeeId) {
        await uploadEmployeePhoto(employeeId, photoFile);
        fire("Photo uploaded");
      }
      await qc.invalidateQueries({ queryKey: ["hr-employees"] });
      onClose();
    } catch (ex) {
      fire(ex instanceof Error ? ex.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const tabs: FormTab[] = ["basic", "employment", "shift", "salary", "statutory", "bank"];
  const grossComp =
    (Number(f.basic) || 0) +
    (Number(f.hra) || 0) +
    (Number(f.conveyance) || 0) +
    (Number(f.special_allow) || 0);

  const T = (
    k: keyof FormState,
    label: string,
    opts?: string[],
    type = "text",
  ) => (
    <label className="fld">
      <span className="l">{label}</span>
      {opts ? (
        <select className="input" value={String(f[k])} onChange={(e) => set(k, e.target.value as never)}>
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={`input${err[k as string] ? " err" : ""}`}
          type={type}
          value={String(f[k] ?? "")}
          onChange={(e) => set(k, e.target.value as never)}
        />
      )}
      {err[k as string] && <div className="errmsg">{err[k as string]}</div>}
    </label>
  );

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <h3>{emp ? "Edit Employee" : "Add Employee"}</h3>
          <button type="button" className="x" onClick={onClose}>
            ×
          </button>
        </div>
        <div style={{ padding: "12px 24px 0" }}>
          <div className="pill-tab">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                className={tab === t ? "on" : ""}
                onClick={() => setTab(t)}
                style={{ textTransform: "capitalize" }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-b" style={{ paddingTop: 4 }}>
          {tab === "basic" && (
            <>
              <div className="row-flex" style={{ gap: 16, marginBottom: 14, alignItems: "flex-start" }}>
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt={f.full_name}
                    className="avatar"
                    style={{ width: 84, height: 84, objectFit: "cover", borderRadius: "50%" }}
                  />
                ) : (
                  <EmployeeAvatar name={f.full_name || "?"} photoUrl={emp?.photo_url} size={84} fontSize={24} />
                )}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label className="fld" style={{ marginBottom: 10 }}>
                    <span className="l">Profile photo</span>
                    <input
                      className="input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setPhotoFile(file);
                        setPhotoPreview(file ? URL.createObjectURL(file) : null);
                      }}
                    />
                  </label>
                  <div className="grid g2" style={{ gap: "0 16px" }}>
                    {T("full_name", "Full Name")}
                    {T("gender", "Gender", ["Female", "Male", "Other"])}
                  </div>
                </div>
              </div>
              <div className="grid g2" style={{ gap: "0 16px" }}>
                {T("dob", "Date of Birth", undefined, "date")}
                {T("mobile", "Mobile Number")}
                {T("email", "Email Address", undefined, "email")}
                {T("emergency", "Emergency Contact")}
              </div>
              {T("addr_current", "Current Address")}
              {T("addr_permanent", "Permanent Address")}
            </>
          )}
          {tab === "employment" && (
            <div className="grid g2" style={{ gap: "0 16px" }}>
              {T("designation", "Designation")}
              {T("department", "Department", [...DEPARTMENTS])}
              <label className="fld">
                <span className="l">Branch</span>
                <select
                  className="input"
                  value={f.branch_id}
                  onChange={(e) => set("branch_id", e.target.value)}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fld">
                <span className="l">Payroll Company</span>
                <select
                  className="input"
                  value={f.company_id}
                  onChange={(e) => set("company_id", e.target.value)}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              {T("employment_type", "Employment Type", [
                "Full-Time",
                "Part-Time",
                "Intern",
                "Temporary",
                "Contract",
              ])}
              {T("date_of_joining", "Date of Joining", undefined, "date")}
              {T("notice_period", "Notice Period", ["30 days", "60 days", "90 days", "15 days"])}
              {T("work_week", "Work Week", ["6-Day", "5-Day"])}
              {T("status", "Status", ["On Probation", "Confirmed", "Resigned", "Terminated", "On Notice"])}
              <label className="fld">
                <span className="l">CRM login (ESS self-access)</span>
                <select
                  className="input"
                  value={f.staff_id}
                  onChange={(e) => set("staff_id", e.target.value)}
                >
                  <option value="">— not linked —</option>
                  {crmStaff
                    .filter((s) => !s.employee_id || s.employee_id === emp?.id)
                    .map((s) => (
                      <option key={s.staff_id} value={s.staff_id}>
                        {s.full_name} {s.email ? `(${s.email})` : ""}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          )}
          {tab === "shift" && (
            <div className="grid g2" style={{ gap: "0 16px" }}>
              <label className="fld">
                <span className="l">Assigned Shift</span>
                <select
                  className="input"
                  value={f.shift_id}
                  onChange={(e) => set("shift_id", e.target.value)}
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.login_time?.slice(0, 5)}–{s.logout_time?.slice(0, 5)})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {tab === "salary" && (
            <>
              <label className="fld">
                <span className="l">Monthly Gross Salary (₹) — fills components</span>
                <input
                  className={`input mono${err.monthly ? " err" : ""}`}
                  type="number"
                  value={f.monthly_gross}
                  onChange={(e) => fillComponents(e.target.value)}
                />
                {err.monthly && <div className="errmsg">{err.monthly}</div>}
              </label>
              <div className="sec-label">Components</div>
              <div className="grid g2" style={{ gap: "0 16px" }}>
                {(["basic", "hra", "conveyance", "special_allow", "incentive", "bonus"] as const).map(
                  (k) => (
                    <label key={k} className="fld">
                      <span className="l">{k.replace("_", " ")}</span>
                      <input
                        className="input mono"
                        type="number"
                        value={f[k]}
                        onChange={(e) =>
                          set(k, e.target.value === "" ? "" : parseFloat(e.target.value))
                        }
                      />
                    </label>
                  ),
                )}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: grossComp === Number(f.monthly_gross) ? "var(--good)" : "var(--clay)",
                  marginTop: 4,
                }}
              >
                Components total: {inr(grossComp)}{" "}
                {grossComp === Number(f.monthly_gross)
                  ? "✓ matches gross"
                  : `(gross is ${inr(Number(f.monthly_gross) || 0)})`}
              </div>
            </>
          )}
          {tab === "statutory" && (
            <>
              <div className="sec-label">Provident Fund</div>
              <label className="row-flex" style={{ fontSize: 13, marginBottom: 10 }}>
                <input
                  type="checkbox"
                  checked={f.pf_applicable}
                  onChange={(e) => set("pf_applicable", e.target.checked)}
                />
                PF Applicable (12% of basic, capped at ₹15,000 wage)
              </label>
              <div className="grid g2" style={{ gap: "0 16px" }}>
                {T("pf_number", "PF Number")}
                {T("uan", "UAN Number")}
              </div>
              <div className="sec-label">ESIC</div>
              <label className="row-flex" style={{ fontSize: 13, marginBottom: 10 }}>
                <input
                  type="checkbox"
                  checked={f.esic_applicable}
                  onChange={(e) => set("esic_applicable", e.target.checked)}
                />
                ESIC Applicable (0.75%, only if gross ≤ ₹21,000)
              </label>
              {T("esic_number", "ESIC Number")}
            </>
          )}
          {tab === "bank" && (
            <>
              <div className="sec-label">Bank Details (salary disbursement)</div>
              <div className="grid g2" style={{ gap: "0 16px" }}>
                {T("bank_holder_name", "Account Holder Name")}
                {T("bank_name", "Bank Name")}
                {T("bank_account_number", "Account Number")}
                {T("bank_ifsc", "IFSC Code")}
                {T("bank_branch", "Branch Name")}
                {T("bank_account_type", "Account Type", ["Savings", "Current"])}
              </div>
              <label className="row-flex" style={{ fontSize: 13, marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={f.bank_verified}
                  onChange={(e) => set("bank_verified", e.target.checked)}
                />
                Bank details verified
              </label>
            </>
          )}
        </div>
        <div className="modal-f">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
            {emp ? "Save Changes" : "Add Employee"}
          </button>
        </div>
      </div>
    </div>
  );
}
