import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID, DEPARTMENTS, EMPLOYMENT_TYPES } from "../../lib/constants";
import { fillSalaryComponents, formatMoney, normalizeEmploymentType, parseEmergencyContacts, payrollCompanyLabel, weeklyOffDays } from "../../lib/format";
import {
  companiesForPayrollRegion,
  defaultPayrollEntityRegion,
  PAYROLL_ENTITY_REGIONS,
  type PayrollEntityRegion,
} from "../../lib/payrollCompanies";
import { uploadEmployeePhoto, uploadSecurityCheque, deleteSecurityCheque } from "../../lib/hrStorage";
import { getHrActorInfo, hrAudit } from "../../lib/hrApi";
import {
  SECURITY_CHEQUE_STATUSES,
  formatSecurityChequeAuditValue,
  isValidSecurityChequeFile,
  isValidSecurityChequeStatus,
  type SecurityChequeStatus,
} from "../../lib/securityCheque";
import { EmployeeAvatar } from "../ui/EmployeeAvatar";
import type { BranchRow, CompanyRow, EmergencyContact, EmployeeRow, ShiftRow, CrmStaffRow } from "../../lib/types";
import { fetchNextEmpCode, useHrEmployee, useHrEmployees } from "../../hooks/useHrEmployees";
import { useHrCrmStaff, useCrmProfile } from "../../hooks/useHrTeam";
import { useHrPolicies } from "../../hooks/useHrRequests";
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
  emp_code: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  full_name: string;
  gender: string;
  dob: string;
  mobile: string;
  email: string;
  addr_current: string;
  addr_permanent: string;
  emergency: string;
  emergency_contacts: EmergencyContact[];
  marital_status: string;
  blood_group: string;
  nationality: string;
  designation: string;
  department: string;
  branch_id: string;
  reporting_mgr_id: string;
  company_id: string;
  employment_type: string;
  date_of_joining: string;
  notice_period: string;
  probation_start_date: string;
  probation_end_date: string;
  status: string;
  shift_id: string;
  salary_currency: string;
  payroll_country: string;
  monthly_gross: number | "";
  basic: number | "";
  hra: number | "";
  conveyance: number | "";
  special_allow: number | "";
  incentive: number | "";
  bonus: number | "";
  pf_applicable: boolean;
  has_pf_account: boolean;
  has_esic_account: boolean;
  pf_number: string;
  uan: string;
  esic_applicable: boolean;
  esic_number: string;
  pt_applicable: boolean;
  tds_applicable: boolean;
  lwf_applicable: boolean;
  other_deductions: number | "";
  bank_holder_name: string;
  bank_name: string;
  bank_account_number: string;
  bank_ifsc: string;
  bank_branch: string;
  bank_account_type: string;
  bank_verified: boolean;
  security_cheque_status: SecurityChequeStatus;
  security_cheque_reason: string;
  staff_id: string;
};

function workWeekFromShift(shiftId: string, shifts: ShiftRow[]): "6-Day" | "5-Day" {
  const s = shifts.find((x) => x.id === shiftId);
  const days = s?.working_days_per_week ?? 6;
  return days >= 6 ? "6-Day" : "5-Day";
}

function fromEmployee(e: EmployeeRow): FormState {
  const parts = e.full_name.trim().split(/\s+/);
  return {
    emp_code: e.emp_code ?? "",
    first_name: e.first_name ?? parts[0] ?? "",
    middle_name: e.middle_name ?? "",
    last_name: e.last_name ?? parts.slice(1).join(" ") ?? "",
    full_name: e.full_name,
    gender: e.gender ?? "Female",
    dob: e.dob ?? "",
    mobile: e.mobile ?? "",
    email: e.email ?? "",
    addr_current: e.addr_current ?? "",
    addr_permanent: e.addr_permanent ?? "",
    emergency: e.emergency ?? "",
    emergency_contacts: parseEmergencyContacts(e.emergency_contacts),
    marital_status: e.marital_status ?? "",
    blood_group: e.blood_group ?? "",
    nationality: e.nationality ?? "Indian",
    designation: e.designation ?? "",
    department: e.department ?? "Counselling",
    branch_id: e.branch_id ?? "",
    reporting_mgr_id: e.reporting_mgr_id ?? "",
    company_id: e.company_id ?? "",
    employment_type: normalizeEmploymentType(e.employment_type),
    date_of_joining: e.date_of_joining ?? "",
    notice_period: e.notice_period ?? "30 days",
    probation_start_date: e.probation_start_date ?? "",
    probation_end_date: e.probation_end_date ?? "",
    status: e.status,
    shift_id: e.shift_id ?? "",
    salary_currency: e.salary_currency ?? e.companies?.currency ?? "INR",
    payroll_country: e.payroll_country ?? "IN",
    monthly_gross: e.monthly_gross,
    basic: e.basic,
    hra: e.hra,
    conveyance: e.conveyance,
    special_allow: e.special_allow,
    incentive: e.incentive,
    bonus: e.bonus,
    pf_applicable: e.pf_applicable,
    has_pf_account: e.has_pf_account ?? e.pf_applicable,
    has_esic_account: e.has_esic_account ?? e.esic_applicable,
    pf_number: e.pf_number ?? "",
    uan: e.uan ?? "",
    esic_applicable: e.esic_applicable,
    esic_number: e.esic_number ?? "",
    pt_applicable: e.pt_applicable ?? true,
    tds_applicable: e.tds_applicable ?? false,
    lwf_applicable: e.lwf_applicable ?? false,
    other_deductions: e.other_deductions ?? 0,
    bank_holder_name: e.bank_holder_name ?? "",
    bank_name: e.bank_name ?? "",
    bank_account_number: e.bank_account_number ?? "",
    bank_ifsc: e.bank_ifsc ?? "",
    bank_branch: e.bank_branch ?? "",
    bank_account_type: e.bank_account_type ?? "Savings",
    bank_verified: e.bank_verified,
    security_cheque_status: isValidSecurityChequeStatus(e.security_cheque_status ?? "")
      ? e.security_cheque_status
      : "Pending",
    security_cheque_reason: e.security_cheque_reason ?? "",
    staff_id: e.staff_id ?? "",
  };
}

const blank = (shifts: ShiftRow[], companies: CompanyRow[], branches: BranchRow[]): FormState => {
  const indian = companiesForPayrollRegion(companies, "IN");
  const firstCo = indian[0] ?? companies[0];
  return {
  emp_code: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  full_name: "",
  gender: "Female",
  dob: "",
  mobile: "",
  email: "",
  addr_current: "",
  addr_permanent: "",
  emergency: "",
  emergency_contacts: parseEmergencyContacts(null),
  marital_status: "",
  blood_group: "",
  nationality: "Indian",
  designation: "",
  department: "Counselling",
  branch_id: branches[0]?.id ?? "",
  reporting_mgr_id: "",
  company_id: firstCo?.id ?? "",
  employment_type: "Full time - Permanent",
  date_of_joining: "",
  notice_period: "30 days",
  probation_start_date: "",
  probation_end_date: "",
  status: "On Probation",
  shift_id: shifts[0]?.id ?? "",
  salary_currency: firstCo?.currency ?? "INR",
  payroll_country: "IN",
  monthly_gross: "",
  basic: "",
  hra: "",
  conveyance: "",
  special_allow: "",
  incentive: 0,
  bonus: 0,
  pf_applicable: true,
  has_pf_account: true,
  has_esic_account: false,
  pf_number: "",
  uan: "",
  esic_applicable: false,
  esic_number: "",
  pt_applicable: true,
  tds_applicable: false,
  lwf_applicable: false,
  other_deductions: 0,
  bank_holder_name: "",
  bank_name: "",
  bank_account_number: "",
  bank_ifsc: "",
  bank_branch: "",
  bank_account_type: "Savings",
  bank_verified: false,
  security_cheque_status: "Pending",
  security_cheque_reason: "",
  staff_id: "",
};
};

export function EmployeeFormModal({ emp, companies, branches, shifts, onClose }: Props) {
  const { fire } = useHrAccess();
  const qc = useQueryClient();
  const { data: employees = [] } = useHrEmployees();
  const { data: liveEmp } = useHrEmployee(emp?.id);
  const sourceEmp = liveEmp ?? emp;
  const { data: crmStaff = [], isError: crmStaffError } = useHrCrmStaff();
  const [tab, setTab] = useState<FormTab>("basic");
  const [f, setF] = useState<FormState>(
    sourceEmp ? fromEmployee(sourceEmp) : blank(shifts, companies, branches),
  );
  const [entityRegion, setEntityRegion] = useState<PayrollEntityRegion>(() => {
    const co = companies.find((c) => c.id === sourceEmp?.company_id);
    return defaultPayrollEntityRegion(sourceEmp?.payroll_country, co);
  });
  const payrollCompanies = useMemo(
    () => companiesForPayrollRegion(companies, entityRegion),
    [companies, entityRegion],
  );
  const { data: linkedProfile } = useCrmProfile(f.staff_id || sourceEmp?.staff_id || undefined);
  const { data: policies = [] } = useHrPolicies();
  const ptDefaultAmount = useMemo(() => {
    const pt = policies.find((p) => p.domain === "professional_tax");
    return Number(pt?.config?.default_amount ?? 200);
  }, [policies]);
  const [err, setErr] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const chequeFileRef = useRef<HTMLInputElement>(null);
  const [chequeFile, setChequeFile] = useState<File | null>(null);
  const [chequeRemoved, setChequeRemoved] = useState(false);

  useEffect(() => {
    if (sourceEmp) {
      setF(fromEmployee(sourceEmp));
      setChequeFile(null);
      setChequeRemoved(false);
      if (chequeFileRef.current) chequeFileRef.current.value = "";
      const co = companies.find((c) => c.id === sourceEmp.company_id);
      setEntityRegion(defaultPayrollEntityRegion(sourceEmp.payroll_country, co));
    }
  }, [sourceEmp?.id, sourceEmp?.staff_id, sourceEmp?.company_id, sourceEmp?.payroll_country, companies]);

  useEffect(() => {
    if (payrollCompanies.some((c) => c.id === f.company_id)) return;
    const first = payrollCompanies[0];
    setF((prev) => ({
      ...prev,
      company_id: first?.id ?? "",
      salary_currency: first?.currency ?? (entityRegion === "CA" ? "CAD" : "INR"),
      payroll_country: entityRegion,
    }));
  }, [entityRegion, payrollCompanies, f.company_id]);

  useEffect(() => {
    if (emp) return;
    let cancelled = false;
    void fetchNextEmpCode().then((code) => {
      if (cancelled) return;
      setF((prev) => (prev.emp_code ? prev : { ...prev, emp_code: code }));
    });
    return () => {
      cancelled = true;
    };
  }, [emp]);

  const crmLinkOptions = useMemo(() => {
    const available = crmStaff.filter((s) => !s.employee_id || s.employee_id === emp?.id);
    if (!f.staff_id) return available;
    const linked = crmStaff.find((s) => s.staff_id === f.staff_id);
    if (linked && !available.some((s) => s.staff_id === linked.staff_id)) {
      return [linked, ...available];
    }
    if (!linked) {
      const fallback: CrmStaffRow = {
        staff_id: f.staff_id,
        email: linkedProfile?.email ?? null,
        full_name: linkedProfile?.full_name ?? "Linked CRM login",
        profile_status: "active",
        crm_roles: [],
        hr_role: null,
        hr_assignment_id: null,
        scope_branch_id: null,
        profile_branch_id: null,
        branch_name: null,
        employee_id: emp?.id ?? null,
        emp_code: emp?.emp_code ?? null,
        employee_name: emp?.full_name ?? null,
      };
      return [fallback, ...available];
    }
    return available;
  }, [crmStaff, emp?.id, emp?.emp_code, emp?.full_name, f.staff_id, linkedProfile?.email, linkedProfile?.full_name]);

  const managerOptions = useMemo(
    () => employees.filter((e) => e.id !== emp?.id),
    [employees, emp?.id],
  );

  const linkedCrmLabel = useMemo(() => {
    if (!f.staff_id) return null;
    const row = crmStaff.find((s) => s.staff_id === f.staff_id);
    const email = row?.email ?? linkedProfile?.email;
    const name = row?.full_name ?? linkedProfile?.full_name;
    if (!name && !email) return null;
    return email ? `${name ?? email} (${email})` : (name ?? null);
  }, [crmStaff, f.staff_id, linkedProfile?.email, linkedProfile?.full_name]);

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
    if (!f.emp_code.trim()) e.emp_code = "Employee ID required";
    if (!f.first_name.trim()) e.name = "First name required";
    if (!f.last_name.trim()) e.lastName = "Last name required";
    if (!f.designation.trim()) e.desig = "Designation required";
    if (!f.monthly_gross || Number(f.monthly_gross) <= 0) e.monthly = "Valid monthly salary required";

    if (!isValidSecurityChequeStatus(f.security_cheque_status)) {
      e.security_cheque_status = "Security Cheque Status is required";
    }

    const existingChequePath =
      chequeRemoved ? null : (sourceEmp?.security_cheque_storage_path ?? null);
    const hasChequeFile = Boolean(chequeFile) || Boolean(existingChequePath);
    const reasonValue =
      f.security_cheque_status === "Submitted" ? null : f.security_cheque_reason.trim() || null;

    if (f.security_cheque_status !== "Submitted" && !reasonValue) {
      e.security_cheque_reason = "Reason is required";
    }
    if (f.security_cheque_status === "Submitted" && !hasChequeFile) {
      e.security_cheque_upload = "Security cheque upload is required when status is Submitted";
    }
    if (chequeFile && !isValidSecurityChequeFile(chequeFile)) {
      e.security_cheque_upload = "Allowed formats: JPG, JPEG, PNG, PDF";
    }

    setErr(e);
    if (Object.keys(e).length) {
      const bankErr = e.security_cheque_status || e.security_cheque_reason || e.security_cheque_upload;
      setTab(
        bankErr
          ? "bank"
          : e.emp_code || e.name || e.lastName || e.desig
            ? "basic"
            : "salary",
      );
      return;
    }

    setSaving(true);
    const fullName = [f.first_name, f.middle_name, f.last_name]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");
    const contacts = f.emergency_contacts
      .map((c) => ({ name: c.name.trim(), phone: c.phone.trim(), relation: c.relation.trim() }))
      .filter((c) => c.name || c.phone);
    const payload = {
      org_id: HR_ORG_ID,
      emp_code: f.emp_code.trim(),
      first_name: f.first_name.trim(),
      middle_name: f.middle_name.trim() || null,
      last_name: f.last_name.trim(),
      full_name: fullName,
      gender: f.gender,
      dob: f.dob || null,
      mobile: f.mobile || null,
      email: f.email || null,
      addr_current: f.addr_current || null,
      addr_permanent: f.addr_permanent || null,
      emergency: f.emergency || contacts[0]?.phone || null,
      emergency_contacts: contacts,
      marital_status: f.marital_status || null,
      blood_group: f.blood_group || null,
      nationality: f.nationality || null,
      designation: f.designation.trim(),
      department: f.department,
      branch_id: f.branch_id || null,
      reporting_mgr_id: f.reporting_mgr_id || null,
      company_id: f.company_id || null,
      employment_type: f.employment_type,
      date_of_joining: f.date_of_joining || null,
      notice_period: f.notice_period,
      probation_start_date: f.probation_start_date || null,
      probation_end_date: f.probation_end_date || null,
      work_week: workWeekFromShift(f.shift_id, shifts),
      status: f.status,
      shift_id: f.shift_id || null,
      salary_currency: f.salary_currency,
      payroll_country: f.payroll_country,
      monthly_gross: Number(f.monthly_gross),
      basic: Number(f.basic) || 0,
      hra: Number(f.hra) || 0,
      conveyance: Number(f.conveyance) || 0,
      special_allow: Number(f.special_allow) || 0,
      incentive: Number(f.incentive) || 0,
      bonus: Number(f.bonus) || 0,
      pf_applicable: f.has_pf_account ? f.pf_applicable : false,
      has_pf_account: f.has_pf_account,
      has_esic_account: f.has_esic_account,
      pf_number: f.pf_number || null,
      uan: f.uan || null,
      esic_applicable: f.has_esic_account ? f.esic_applicable : false,
      esic_number: f.esic_number || null,
      pt_applicable: f.pt_applicable,
      tds_applicable: f.tds_applicable,
      lwf_applicable: f.lwf_applicable,
      other_deductions: Number(f.other_deductions) || 0,
      bank_holder_name: f.bank_holder_name || null,
      bank_name: f.bank_name || null,
      bank_account_number: f.bank_account_number || null,
      bank_ifsc: f.bank_ifsc || null,
      bank_branch: f.bank_branch || null,
      bank_account_type: f.bank_account_type || "Savings",
      bank_verified: f.bank_verified,
      security_cheque_status: f.security_cheque_status,
      security_cheque_reason: reasonValue,
      staff_id: f.staff_id || null,
    };

    const auditTarget = `${f.emp_code.trim()} · ${fullName}`;
    const actor = await getHrActorInfo();

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
        const { data, error } = await supabase
          .from("employees" as never)
          .insert(payload as never)
          .select("id")
          .single();
        if (error) throw error;
        employeeId = (data as { id: string }).id;
        fire(`Employee ${fullName} added`);
      }

      if (employeeId) {
        const prevPath = sourceEmp?.security_cheque_storage_path ?? null;
        const prevName = sourceEmp?.security_cheque_file_name ?? null;
        const prevLabel = sourceEmp?.security_cheque_uploaded_by_label ?? "—";
        const prevAt = sourceEmp?.security_cheque_uploaded_at ?? "";

        if (chequeRemoved && prevPath) {
          await deleteSecurityCheque(employeeId, prevPath);
          await hrAudit(
            "Security Cheque Deleted",
            auditTarget,
            formatSecurityChequeAuditValue(prevName ?? "file", prevLabel, prevAt),
            "—",
            actor,
          );
        }

        if (chequeFile) {
          const uploaded = await uploadSecurityCheque(employeeId, chequeFile, actor, chequeRemoved ? null : prevPath);
          const newAudit = formatSecurityChequeAuditValue(
            uploaded.file_name,
            uploaded.uploaded_by_label,
            uploaded.uploaded_at,
          );
          if (prevPath && !chequeRemoved) {
            await hrAudit(
              "Security Cheque Replaced",
              auditTarget,
              formatSecurityChequeAuditValue(prevName ?? "file", prevLabel, prevAt),
              newAudit,
              actor,
            );
          } else {
            await hrAudit("Security Cheque Uploaded", auditTarget, "—", newAudit, actor);
          }
        }

        if (sourceEmp) {
          const prevStatus = sourceEmp.security_cheque_status ?? "Pending";
          if (prevStatus !== f.security_cheque_status) {
            await hrAudit(
              "Security Cheque Status",
              auditTarget,
              prevStatus,
              f.security_cheque_status,
              actor,
            );
          }
          const prevReason = sourceEmp.security_cheque_reason ?? null;
          if (prevReason !== reasonValue) {
            await hrAudit(
              "Security Cheque Reason",
              auditTarget,
              prevReason ?? "—",
              reasonValue ?? "—",
              actor,
            );
          }
        }
      }

      if (photoFile && employeeId) {
        await uploadEmployeePhoto(employeeId, photoFile);
        fire("Photo uploaded");
      }
      await qc.invalidateQueries({ queryKey: ["hr-employees"] });
      if (employeeId) await qc.invalidateQueries({ queryKey: ["hr-employee", HR_ORG_ID, employeeId] });
      await qc.invalidateQueries({ queryKey: ["hr-crm-staff"] });
      onClose();
    } catch (ex) {
      fire(ex instanceof Error ? ex.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const tabs: FormTab[] = ["basic", "employment", "shift", "salary", "statutory", "bank"];
  const fullName =
    [f.first_name, f.middle_name, f.last_name].filter(Boolean).join(" ").trim() || f.full_name;
  const selectedShift = shifts.find((s) => s.id === f.shift_id);
  const grossComp =
    (Number(f.basic) || 0) +
    (Number(f.hra) || 0) +
    (Number(f.conveyance) || 0) +
    (Number(f.special_allow) || 0);

  const existingChequePath =
    chequeRemoved ? null : (sourceEmp?.security_cheque_storage_path ?? null);
  const existingChequeName =
    chequeRemoved ? null : (sourceEmp?.security_cheque_file_name ?? null);
  const showChequeReason = f.security_cheque_status !== "Submitted";

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
    <div className="modal-bg">
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
              <label className="fld" style={{ marginBottom: 14 }}>
                <span className="l">Employee ID</span>
                <input
                  className={`input mono${err.emp_code ? " err" : ""}`}
                  type="text"
                  placeholder="e.g. FL-1050"
                  value={f.emp_code}
                  onChange={(e) => set("emp_code", e.target.value)}
                />
                {err.emp_code ? (
                  <div className="errmsg">{err.emp_code}</div>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 4 }}>
                    {emp
                      ? "Used in payroll, attendance import, and employee search."
                      : "Auto-suggested from the next available ID — edit if needed before saving."}
                  </div>
                )}
              </label>
              <div className="row-flex" style={{ gap: 16, marginBottom: 14, alignItems: "flex-start" }}>
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt={fullName}
                    className="avatar"
                    style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 12 }}
                  />
                ) : (
                  <EmployeeAvatar name={fullName || "?"} photoUrl={emp?.photo_url} size={84} fontSize={24} />
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
                    {T("first_name", "First Name")}
                    {T("middle_name", "Middle Name")}
                    {T("last_name", "Last Name")}
                    {T("gender", "Gender", ["Female", "Male", "Other"])}
                  </div>
                </div>
              </div>
              <div className="grid g2" style={{ gap: "0 16px" }}>
                {T("dob", "Date of Birth", undefined, "date")}
                {T("mobile", "Mobile Number")}
                {T("email", "Email Address", undefined, "email")}
                {T("marital_status", "Marital Status", ["", "Single", "Married", "Divorced", "Widowed"])}
                {T("blood_group", "Blood Group", ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])}
                {T("nationality", "Nationality")}
              </div>
              <div className="sec-label">Emergency contacts (up to 2)</div>
              {f.emergency_contacts.map((c, i) => (
                <div key={i} className="grid g3" style={{ gap: "0 12px", marginBottom: 8 }}>
                  <label className="fld">
                    <span className="l">Name {i + 1}</span>
                    <input
                      className="input"
                      value={c.name}
                      onChange={(e) => {
                        const next = [...f.emergency_contacts];
                        next[i] = { ...next[i], name: e.target.value };
                        set("emergency_contacts", next);
                      }}
                    />
                  </label>
                  <label className="fld">
                    <span className="l">Phone</span>
                    <input
                      className="input"
                      value={c.phone}
                      onChange={(e) => {
                        const next = [...f.emergency_contacts];
                        next[i] = { ...next[i], phone: e.target.value };
                        set("emergency_contacts", next);
                      }}
                    />
                  </label>
                  <label className="fld">
                    <span className="l">Relation</span>
                    <input
                      className="input"
                      value={c.relation}
                      onChange={(e) => {
                        const next = [...f.emergency_contacts];
                        next[i] = { ...next[i], relation: e.target.value };
                        set("emergency_contacts", next);
                      }}
                    />
                  </label>
                </div>
              ))}
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
                <span className="l">Reporting Manager</span>
                <select
                  className="input"
                  value={f.reporting_mgr_id}
                  onChange={(e) => set("reporting_mgr_id", e.target.value)}
                >
                  <option value="">— none —</option>
                  {managerOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.emp_code})
                    </option>
                  ))}
                </select>
              </label>
              <label className="fld">
                <span className="l">Payroll entity type</span>
                <select
                  className="input"
                  value={entityRegion}
                  onChange={(e) => {
                    const region = e.target.value as PayrollEntityRegion;
                    setEntityRegion(region);
                    const list = companiesForPayrollRegion(companies, region);
                    const first = list[0];
                    setF((prev) => ({
                      ...prev,
                      company_id: first?.id ?? "",
                      salary_currency: first?.currency ?? (region === "CA" ? "CAD" : "INR"),
                      payroll_country: region,
                    }));
                  }}
                >
                  {PAYROLL_ENTITY_REGIONS.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fld">
                <span className="l">Payroll Company</span>
                <select
                  className="input"
                  value={f.company_id}
                  onChange={(e) => {
                    const co = payrollCompanies.find((c) => c.id === e.target.value);
                    setF((prev) => ({
                      ...prev,
                      company_id: e.target.value,
                      salary_currency: co?.currency ?? prev.salary_currency,
                      payroll_country: entityRegion,
                    }));
                  }}
                >
                  {payrollCompanies.length === 0 ? (
                    <option value="">— no companies for this region —</option>
                  ) : (
                    payrollCompanies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {payrollCompanyLabel(c)}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <div className="grid g2" style={{ gap: "0 16px" }}>
                {T("salary_currency", "Salary Currency", ["INR", "CAD"])}
                {T("payroll_country", "Payroll Country", ["IN", "CA"])}
              </div>
              {T("employment_type", "Employment Type", [...EMPLOYMENT_TYPES])}
              {T("date_of_joining", "Date of Joining", undefined, "date")}
              {T("probation_start_date", "Probation Start", undefined, "date")}
              {T("probation_end_date", "Probation End", undefined, "date")}
              {T("notice_period", "Notice Period", ["30 days", "60 days", "90 days", "15 days"])}
              {T("status", "Status", ["On Probation", "Confirmed", "Resigned", "Terminated", "On Notice"])}
              <label className="fld">
                <span className="l">CRM login (ESS self-access)</span>
                <select
                  className="input"
                  value={f.staff_id}
                  onChange={(e) => set("staff_id", e.target.value)}
                >
                  <option value="">— not linked —</option>
                  {crmLinkOptions.map((s) => (
                    <option key={s.staff_id} value={s.staff_id}>
                      {s.full_name} {s.email ? `(${s.email})` : ""}
                    </option>
                  ))}
                </select>
                {f.staff_id && linkedCrmLabel && (
                  <span className="tag" style={{ marginTop: 6, color: "var(--good)", fontSize: 11 }}>
                    Linked: {linkedCrmLabel}
                  </span>
                )}
                {f.staff_id && !linkedCrmLabel && !crmStaffError && (
                  <span className="tag" style={{ marginTop: 6, fontSize: 11 }}>
                    Linked in database — loading login details…
                  </span>
                )}
                {crmStaffError && !linkedCrmLabel && (
                  <span style={{ display: "block", marginTop: 6, fontSize: 11, color: "var(--rose)" }}>
                    CRM user list unavailable — apply migration 24. Link is still saved in database.
                  </span>
                )}
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
              {selectedShift && (
                <div className="fld">
                  <span className="l">Working schedule (from shift)</span>
                  <div className="tag" style={{ marginTop: 6 }}>
                    {selectedShift.working_days_per_week ?? 6} working days / week ·{" "}
                    {weeklyOffDays(selectedShift.working_days_per_week ?? 6)} weekly off · leave entitlement{" "}
                    {workWeekFromShift(f.shift_id, shifts)}
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === "salary" && (
            <>
              <label className="fld">
                <span className="l">
                  Monthly Gross Salary ({f.salary_currency === "CAD" ? "CAD" : "₹"}) — fills components
                </span>
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
                Components total: {formatMoney(grossComp, f.salary_currency)}{" "}
                {grossComp === Number(f.monthly_gross)
                  ? "✓ matches gross"
                  : `(gross is ${formatMoney(Number(f.monthly_gross) || 0, f.salary_currency)})`}
              </div>
            </>
          )}
          {tab === "statutory" && (
            <>
              <div className="sec-label">Provident Fund</div>
              <label className="row-flex" style={{ fontSize: 13, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={f.has_pf_account}
                  onChange={(e) => set("has_pf_account", e.target.checked)}
                />
                Employee has PF account
              </label>
              {f.has_pf_account && (
                <label className="row-flex" style={{ fontSize: 13, marginBottom: 10 }}>
                  <input
                    type="checkbox"
                    checked={f.pf_applicable}
                    onChange={(e) => set("pf_applicable", e.target.checked)}
                  />
                  PF Applicable (12% of basic, capped at ₹15,000 wage)
                </label>
              )}
              <div className="grid g2" style={{ gap: "0 16px" }}>
                {T("pf_number", "PF Number")}
                {T("uan", "UAN Number")}
              </div>
              <div className="sec-label">ESIC</div>
              <label className="row-flex" style={{ fontSize: 13, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={f.has_esic_account}
                  onChange={(e) => set("has_esic_account", e.target.checked)}
                />
                Employee has ESIC account
              </label>
              {f.has_esic_account && (
                <label className="row-flex" style={{ fontSize: 13, marginBottom: 10 }}>
                  <input
                    type="checkbox"
                    checked={f.esic_applicable}
                    onChange={(e) => set("esic_applicable", e.target.checked)}
                  />
                  ESIC Applicable (0.75%, mandatory if monthly gross ≤ ₹21,000)
                </label>
              )}
              {T("esic_number", "ESIC Number")}
              <div className="sec-label">Professional Tax</div>
              <label className="row-flex" style={{ fontSize: 13, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={f.pt_applicable}
                  onChange={(e) => set("pt_applicable", e.target.checked)}
                />
                PT Applicable (default ₹{ptDefaultAmount.toLocaleString("en-IN")} — change in Payroll Config)
              </label>
              <div className="sec-label">Other deductions</div>
              <div className="grid g2" style={{ gap: "0 16px" }}>
                <label className="row-flex" style={{ fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={f.tds_applicable}
                    onChange={(e) => set("tds_applicable", e.target.checked)}
                  />
                  TDS applicable
                </label>
                <label className="row-flex" style={{ fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={f.lwf_applicable}
                    onChange={(e) => set("lwf_applicable", e.target.checked)}
                  />
                  LWF applicable
                </label>
                <label className="fld">
                  <span className="l">Other deductions (₹/mo)</span>
                  <input
                    className="input mono"
                    type="number"
                    value={f.other_deductions}
                    onChange={(e) =>
                      set("other_deductions", e.target.value === "" ? "" : parseFloat(e.target.value))
                    }
                  />
                </label>
              </div>
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
              <div className="sec-label" style={{ marginTop: 16 }}>
                Security Cheque
              </div>
              <label className="fld">
                <span className="l">Security Cheque Status</span>
                <select
                  className={`input${err.security_cheque_status ? " err" : ""}`}
                  value={f.security_cheque_status}
                  onChange={(e) => {
                    const next = e.target.value as SecurityChequeStatus;
                    setF((prev) => ({
                      ...prev,
                      security_cheque_status: next,
                      ...(next === "Submitted" ? { security_cheque_reason: "" } : {}),
                    }));
                  }}
                >
                  {SECURITY_CHEQUE_STATUSES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                {err.security_cheque_status && (
                  <div className="errmsg">{err.security_cheque_status}</div>
                )}
              </label>
              {showChequeReason && (
                <label className="fld">
                  <span className="l">Reason</span>
                  <textarea
                    className={`input${err.security_cheque_reason ? " err" : ""}`}
                    rows={3}
                    value={f.security_cheque_reason}
                    onChange={(e) => set("security_cheque_reason", e.target.value)}
                    placeholder="Why is the security cheque pending or not submitted?"
                  />
                  {err.security_cheque_reason && (
                    <div className="errmsg">{err.security_cheque_reason}</div>
                  )}
                </label>
              )}
              <label className="fld">
                <span className="l">Security Cheque Upload</span>
                {(existingChequeName || chequeFile) && (
                  <div
                    className="row-flex"
                    style={{ fontSize: 12, marginBottom: 6, gap: 8, flexWrap: "wrap" }}
                  >
                    <span className="mono muted">
                      {chequeFile?.name ?? existingChequeName}
                    </span>
                    {(existingChequePath || chequeFile) && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          setChequeFile(null);
                          setChequeRemoved(true);
                          if (chequeFileRef.current) chequeFileRef.current.value = "";
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
                <input
                  ref={chequeFileRef}
                  type="file"
                  className={`input${err.security_cheque_upload ? " err" : ""}`}
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setChequeFile(file);
                    setChequeRemoved(false);
                  }}
                />
                <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 4 }}>
                  JPG, JPEG, PNG, or PDF. Required when status is Submitted.
                </div>
                {err.security_cheque_upload && (
                  <div className="errmsg">{err.security_cheque_upload}</div>
                )}
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
