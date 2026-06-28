import { useState } from "react";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useHrEmployees } from "../../hooks/useHrEmployees";
import { useHrCrmStaff, useCrmProfile } from "../../hooks/useHrTeam";
import { displayEmployeeName, formatMoney, initials, payrollCompanyLabel } from "../../lib/format";
import { personalEmergencyContact, personalEmail, personalMobile } from "../../lib/employeeContact";
import { downloadHrDocument, getHrDocumentSignedUrl } from "../../lib/hrStorage";
import { formatSecurityChequeUploadedAt } from "../../lib/securityCheque";
import { buildMonthlySalaryStructure, employeeToStructureInput } from "../../lib/salaryStructure";
import { useSalaryRevisions } from "../../hooks/useSalaryRevisions";
import type { EmployeeRow } from "../../lib/types";
import { EmployeeDocumentsPanel } from "./EmployeeDocumentsPanel";
import { EmployeeAssetsDetailTable } from "./EmployeeAssetsDetailTable";
import { useEmployeeAssets } from "../../hooks/useEmployeeAssets";

type Tab = "profile" | "employment" | "salary" | "statutory" | "bank" | "assets" | "documents";

export function EmployeeDetailModal({ emp, onClose }: { emp: EmployeeRow; onClose: () => void }) {
  const { fire } = useHrAccess();
  const [tab, setTab] = useState<Tab>("profile");
  const { data: employees = [] } = useHrEmployees();
  const { data: revisions = [] } = useSalaryRevisions(emp.id);
  const { data: crmStaff = [] } = useHrCrmStaff();
  const { data: linkedProfile } = useCrmProfile(emp.staff_id);
  const { data: employeeAssets = [], isLoading: assetsLoading } = useEmployeeAssets(emp.id);
  const currency = emp.salary_currency ?? emp.companies?.currency ?? "INR";
  const money = (n: number) => formatMoney(n, currency);
  const structure = buildMonthlySalaryStructure(employeeToStructureInput(emp));
  const personalEc = personalEmergencyContact(emp.emergency_contacts);
  const reportingManager = emp.reporting_mgr_id
    ? employees.find((e) => e.id === emp.reporting_mgr_id)
    : null;
  const linkedCrm = emp.staff_id ? crmStaff.find((s) => s.staff_id === emp.staff_id) : null;
  const crmLoginLabel = linkedCrm
    ? linkedCrm.email
      ? `${linkedCrm.full_name} (${linkedCrm.email})`
      : linkedCrm.full_name
    : linkedProfile
      ? linkedProfile.email
        ? `${linkedProfile.full_name} (${linkedProfile.email})`
        : linkedProfile.full_name
      : emp.staff_id
        ? "Linked (CRM login)"
        : "— not linked —";

  const Row = ({ k, v }: { k: string; v: string | null | undefined }) => (
    <div>
      <div style={{ fontSize: 11, color: "var(--mut)", fontWeight: 600 }}>{k}</div>
      <div style={{ fontSize: 13.5, marginTop: 3 }}>{v || "—"}</div>
    </div>
  );

  const tabs: Tab[] = ["profile", "employment", "salary", "statutory", "bank", "assets", "documents"];
  const displayName = displayEmployeeName(emp);

  const openCheque = async () => {
    if (!emp.security_cheque_storage_path) return;
    try {
      const url = await getHrDocumentSignedUrl(emp.security_cheque_storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      fire(e instanceof Error ? e.message : "Could not open file");
    }
  };

  const saveCheque = async () => {
    if (!emp.security_cheque_storage_path) return;
    try {
      await downloadHrDocument(
        emp.security_cheque_storage_path,
        emp.security_cheque_file_name ?? "security-cheque",
      );
    } catch (e) {
      fire(e instanceof Error ? e.message : "Could not download file");
    }
  };

  const bankRows: [string, string | null | undefined][] = [
    ["Account Holder", emp.bank_holder_name],
    ["Bank", emp.bank_name],
    ["Account Number", emp.bank_account_number],
    ["IFSC", emp.bank_ifsc],
    ["Branch", emp.bank_branch],
    ["Account Type", emp.bank_account_type],
    ["Verified", emp.bank_verified ? "Yes" : "No"],
    ...(emp.bank_verified
      ? [
          ["Verification Date", formatSecurityChequeUploadedAt(emp.bank_verified_at)],
          ["Verified By", emp.bank_verified_by],
        ]
      : []),
    ["Security Cheque Status", emp.security_cheque_status ?? "Pending"],
  ];

  if (emp.security_cheque_status !== "Submitted" && emp.security_cheque_reason) {
    bankRows.push(["Reason", emp.security_cheque_reason]);
  }
  if (emp.security_cheque_storage_path) {
    bankRows.push(["Uploaded By", emp.security_cheque_uploaded_by_label ?? "—"]);
    bankRows.push(["Uploaded On", formatSecurityChequeUploadedAt(emp.security_cheque_uploaded_at)]);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <div className="row-flex">
            <div className="avatar" style={{ width: 38, height: 38, fontSize: 14 }}>
              {initials(displayName)}
            </div>
            <h3>{displayName}</h3>
          </div>
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
          {tab === "profile" && (
            <>
              <div className="sec-label">Personal information</div>
              <div className="grid g3" style={{ gap: "12px 22px", marginBottom: 16 }}>
                <Row k="Employee ID" v={emp.emp_code} />
                <Row
                  k="Name"
                  v={[emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(" ") || emp.full_name}
                />
                <Row k="Gender" v={emp.gender} />
                <Row k="Date of Birth" v={emp.dob} />
                <Row k="Marital Status" v={emp.marital_status} />
                <Row k="Blood Group" v={emp.blood_group} />
                <Row k="Nationality" v={emp.nationality} />
                <Row k="Current Address" v={emp.addr_current} />
                <Row k="Permanent Address" v={emp.addr_permanent} />
              </div>
              <div className="sec-label">Personal contact information</div>
              <div className="grid g3" style={{ gap: "12px 22px", marginBottom: 16 }}>
                <Row k="Personal Email" v={personalEmail(emp)} />
                <Row k="Personal Mobile" v={personalMobile(emp)} />
                <Row k="Alternate Personal Mobile" v={emp.alternate_personal_mobile} />
                <Row k="Home Telephone" v={emp.home_telephone} />
                <Row k="Preferred Contact Method" v={emp.preferred_contact_method} />
                <Row k="Emergency Contact Person" v={personalEc.name || null} />
                <Row k="Relationship" v={personalEc.relation || null} />
                <Row k="Emergency Contact Number" v={personalEc.phone || null} />
                <Row k="Emergency Contact Email" v={personalEc.email || null} />
                <Row k="Emergency Alternate Mobile" v={personalEc.alternate_mobile || null} />
                <Row k="Emergency Address" v={personalEc.address || null} />
              </div>
              <div className="sec-label">Official company contact information</div>
              <div className="grid g3" style={{ gap: "12px 22px" }}>
                <Row k="Company Email" v={emp.company_email} />
                <Row k="Official Communication Email" v={emp.official_communication_email} />
                <Row k="Company Mobile" v={emp.company_mobile} />
                <Row k="Extension" v={emp.extension_number} />
                <Row k="Direct Office Number" v={emp.direct_office_number} />
                <Row k="Company Emergency Person" v={emp.company_emergency_contact_person} />
                <Row k="Company Emergency Number" v={emp.company_emergency_contact_number} />
                <Row k="Company Emergency Email" v={emp.company_emergency_contact_email} />
              </div>
            </>
          )}
          {tab === "employment" && (
            <div className="grid g3" style={{ gap: "12px 22px" }}>
              <Row k="Designation" v={emp.designations?.name ?? emp.designation} />
              <Row k="Department" v={emp.departments?.name ?? emp.department} />
              <Row k="Branch" v={emp.branches?.name ?? null} />
              <Row
                k="Reporting Manager"
                v={
                  reportingManager
                    ? `${reportingManager.full_name} (${reportingManager.emp_code})`
                    : null
                }
              />
              <Row
                k="Payroll Company"
                v={
                  emp.companies
                    ? payrollCompanyLabel(emp.companies)
                    : null
                }
              />
              <Row k="Currency / Country" v={`${currency} · ${emp.payroll_country ?? "IN"}`} />
              <Row k="Employee Category" v={emp.hr_employee_categories?.label ?? "—"} />
              <Row k="Date of Joining" v={emp.date_of_joining} />
              <Row k="Probation" v={[emp.probation_start_date, emp.probation_end_date].filter(Boolean).join(" – ") || null} />
              <Row k="Notice Period" v={emp.notice_period} />
              <Row k="Exit Date" v={emp.exit_date} />
              <Row k="Exit Reason" v={emp.exit_reason} />
              <Row k="Rehire Eligible" v={emp.rehire_eligible ? "Yes" : emp.exit_date ? "No" : null} />
              <Row k="Work Week (from shift)" v={emp.work_week} />
              <Row k="Status" v={emp.status} />
              <Row k="CRM login (ESS)" v={crmLoginLabel} />
              <Row
                k="Shift"
                v={
                  emp.shifts
                    ? `${emp.shifts.name} (${emp.shifts.login_time?.slice(0, 5)}–${emp.shifts.logout_time?.slice(0, 5)}) · ${emp.shifts.working_days_per_week ?? 6}d/wk`
                    : null
                }
              />
            </div>
          )}
          {tab === "salary" && (
            <>
              <div className="sec-label" style={{ marginBottom: 8 }}>
                Salary structure (CTC)
              </div>
              <div className="grid g2" style={{ gap: 10, marginBottom: 14 }}>
                {[
                  ["Salary Package (CTC)", money(structure.salaryPackage)],
                  ["Basic", money(structure.basic)],
                  ["HRA", money(structure.hra)],
                  ["Conveyance", money(structure.conveyance)],
                  [`Bonus (${structure.bonusPercentage}%)`, money(structure.bonusAmount)],
                  ["Other Allowances", money(structure.otherAllowances)],
                  ["Total Earnings (A)", money(structure.totalEarningsA)],
                  ["Employer Cost (B)", money(structure.totalEmployerCostB)],
                  ["Difference (CTC − A − B)", money(structure.difference)],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 13px",
                      background: "var(--paper)",
                      borderRadius: 9,
                    }}
                  >
                    <span style={{ fontSize: 12, color: "var(--mut)", fontWeight: 600 }}>{k}</span>
                    <span className="mono" style={{ fontSize: 13 }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
              <div className="sec-label" style={{ marginBottom: 8 }}>
                Legacy compensation fields
              </div>
              <div className="grid g2" style={{ gap: 10, marginBottom: 14 }}>
                {[
                  ["Pay basis", emp.pay_basis ?? "Monthly"],
                  ["Monthly Gross", money(emp.monthly_gross)],
                  ["Basic", money(emp.basic)],
                  ["HRA", money(emp.hra)],
                  ["Conveyance", money(emp.conveyance)],
                  ["Special Allowance", money(emp.special_allow)],
                  ["Incentive", money(emp.incentive)],
                  ["Bonus", money(emp.bonus)],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 13px",
                      background: "var(--paper)",
                      borderRadius: 9,
                    }}
                  >
                    <span style={{ fontSize: 12, color: "var(--mut)", fontWeight: 600 }}>{k}</span>
                    <span className="mono" style={{ fontSize: 13 }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
              {revisions.length > 0 && (
                <>
                  <div className="sec-label">Salary revision history</div>
                  <table style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Old</th>
                        <th>New</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revisions.map((r) => (
                        <tr key={r.id}>
                          <td>{r.effective_date}</td>
                          <td className="mono">{money(r.old_salary)}</td>
                          <td className="mono">{money(r.new_salary)}</td>
                          <td className="muted">{r.remarks ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
          {tab === "statutory" && (
            <div className="grid" style={{ gap: 10 }}>
              {[
                ["Employer PF Applicable", emp.employer_pf_applicable ?? emp.pf_applicable ? "Yes" : "No"],
                ["Employer ESIC Applicable", emp.employer_esic_applicable ?? emp.esic_applicable ? "Yes" : "No"],
                ["Employee PF %", `${emp.employee_pf_pct ?? 12}%`],
                ["Employer PF %", `${emp.employer_pf_pct ?? 12}%`],
                ["Employee ESIC %", `${emp.employee_esic_pct ?? 0.75}%`],
                ["Employer ESIC %", `${emp.employer_esic_pct ?? 3.25}%`],
                ["Professional Tax Amount", emp.professional_tax_amount != null ? money(emp.professional_tax_amount) : "Default"],
                ["PF Account", emp.has_pf_account ? "Yes" : "No"],
                ["PF Applicable", emp.pf_applicable ? "Yes" : "No"],
                ["PF Number", emp.pf_number],
                ["UAN", emp.uan],
                ["ESIC Account", emp.has_esic_account ? "Yes" : "No"],
                ["ESIC Applicable", emp.esic_applicable ? "Yes" : "No"],
                ["ESIC Number", emp.esic_number],
                ["PT Applicable", emp.pt_applicable ? "Yes" : "No"],
                ["TDS Applicable", emp.tds_applicable ? "Yes" : "No"],
                ["LWF Applicable", emp.lwf_applicable ? "Yes" : "No"],
                ["Other deductions/mo", emp.other_deductions ? money(emp.other_deductions) : "—"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "11px 14px",
                    background: "var(--paper)",
                    borderRadius: 9,
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--mut)", fontWeight: 600 }}>{k}</span>
                  <span className="mono" style={{ fontSize: 13 }}>
                    {v || "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
          {tab === "bank" && (
            <div className="grid" style={{ gap: 10 }}>
              {bankRows.map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "11px 14px",
                    background: "var(--paper)",
                    borderRadius: 9,
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--mut)", fontWeight: 600 }}>{k}</span>
                  <span className="mono" style={{ fontSize: 13 }}>
                    {v || "—"}
                  </span>
                </div>
              ))}
              {emp.security_cheque_storage_path && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "11px 14px",
                    background: "var(--paper)",
                    borderRadius: 9,
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--mut)", fontWeight: 600 }}>
                    Security Cheque
                  </span>
                  <div className="row-flex" style={{ gap: 6 }}>
                    <span className="mono muted" style={{ fontSize: 12 }}>
                      {emp.security_cheque_file_name ?? "file"}
                    </span>
                    <button type="button" className="btn btn-sm" onClick={() => void openCheque()}>
                      View
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => void saveCheque()}>
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === "assets" && (
            assetsLoading ? (
              <div className="empty">Loading assets…</div>
            ) : (
              <EmployeeAssetsDetailTable assets={employeeAssets} />
            )
          )}
          {tab === "documents" && <EmployeeDocumentsPanel emp={emp} />}
        </div>
        <div className="modal-f">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
