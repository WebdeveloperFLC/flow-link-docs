import { useState } from "react";
import { useHrEmployees } from "../../hooks/useHrEmployees";
import { useHrCrmStaff, useCrmProfile } from "../../hooks/useHrTeam";
import { displayEmployeeName, formatMoney, initials, parseEmergencyContacts } from "../../lib/format";
import { useSalaryRevisions } from "../../hooks/useSalaryRevisions";
import type { EmployeeRow } from "../../lib/types";
import { EmployeeDocumentsPanel } from "./EmployeeDocumentsPanel";

type Tab = "profile" | "employment" | "salary" | "statutory" | "bank" | "documents";

export function EmployeeDetailModal({ emp, onClose }: { emp: EmployeeRow; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("profile");
  const { data: employees = [] } = useHrEmployees();
  const { data: revisions = [] } = useSalaryRevisions(emp.id);
  const { data: crmStaff = [] } = useHrCrmStaff();
  const { data: linkedProfile } = useCrmProfile(emp.staff_id);
  const currency = emp.salary_currency ?? emp.companies?.currency ?? "INR";
  const money = (n: number) => formatMoney(n, currency);
  const contacts = parseEmergencyContacts(emp.emergency_contacts);
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

  const tabs: Tab[] = ["profile", "employment", "salary", "statutory", "bank", "documents"];
  const displayName = displayEmployeeName(emp);

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
            <div className="grid g3" style={{ gap: "12px 22px" }}>
              <Row k="Employee ID" v={emp.emp_code} />
              <Row
                k="Name"
                v={[emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(" ") || emp.full_name}
              />
              <Row k="Gender" v={emp.gender} />
              <Row k="Date of Birth" v={emp.dob} />
              <Row k="Mobile" v={emp.mobile} />
              <Row k="Email" v={emp.email} />
              <Row k="Marital Status" v={emp.marital_status} />
              <Row k="Blood Group" v={emp.blood_group} />
              <Row k="Nationality" v={emp.nationality} />
              {contacts
                .filter((c) => c.name || c.phone)
                .map((c, i) => (
                  <Row key={i} k={`Emergency ${i + 1}`} v={`${c.name} · ${c.phone} (${c.relation})`} />
                ))}
              <Row k="Current Address" v={emp.addr_current} />
              <Row k="Permanent Address" v={emp.addr_permanent} />
            </div>
          )}
          {tab === "employment" && (
            <div className="grid g3" style={{ gap: "12px 22px" }}>
              <Row k="Designation" v={emp.designation} />
              <Row k="Department" v={emp.department} />
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
                  emp.companies?.legal_name
                    ? `${emp.companies.name} (${emp.companies.legal_name})`
                    : emp.companies?.name ?? null
                }
              />
              <Row k="Currency / Country" v={`${currency} · ${emp.payroll_country ?? "IN"}`} />
              <Row k="Employment Type" v={emp.employment_type} />
              <Row k="Date of Joining" v={emp.date_of_joining} />
              <Row k="Probation" v={[emp.probation_start_date, emp.probation_end_date].filter(Boolean).join(" – ") || null} />
              <Row k="Notice Period" v={emp.notice_period} />
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
              <div className="grid g2" style={{ gap: 10, marginBottom: 14 }}>
                {[
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
              {[
                ["Account Holder", emp.bank_holder_name],
                ["Bank", emp.bank_name],
                ["Account Number", emp.bank_account_number],
                ["IFSC", emp.bank_ifsc],
                ["Branch", emp.bank_branch],
                ["Account Type", emp.bank_account_type],
                ["Verified", emp.bank_verified ? "Yes" : "No"],
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
