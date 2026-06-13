import { useState } from "react";
import { inr, initials } from "../../lib/format";
import type { EmployeeRow } from "../../lib/types";

type Tab = "profile" | "employment" | "salary" | "statutory" | "bank";

export function EmployeeDetailModal({ emp, onClose }: { emp: EmployeeRow; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("profile");

  const Row = ({ k, v }: { k: string; v: string | null | undefined }) => (
    <div>
      <div style={{ fontSize: 11, color: "var(--mut)", fontWeight: 600 }}>{k}</div>
      <div style={{ fontSize: 13.5, marginTop: 3 }}>{v || "—"}</div>
    </div>
  );

  const tabs: Tab[] = ["profile", "employment", "salary", "statutory", "bank"];

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <div className="row-flex">
            <div className="avatar" style={{ width: 38, height: 38, fontSize: 14 }}>
              {initials(emp.full_name)}
            </div>
            <h3>{emp.full_name}</h3>
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
              <Row k="Gender" v={emp.gender} />
              <Row k="Date of Birth" v={emp.dob} />
              <Row k="Mobile" v={emp.mobile} />
              <Row k="Email" v={emp.email} />
              <Row k="Emergency Contact" v={emp.emergency} />
              <Row k="Current Address" v={emp.addr_current} />
              <Row k="Permanent Address" v={emp.addr_permanent} />
            </div>
          )}
          {tab === "employment" && (
            <div className="grid g3" style={{ gap: "12px 22px" }}>
              <Row k="Designation" v={emp.designation} />
              <Row k="Department" v={emp.department} />
              <Row k="Branch" v={emp.branches?.name ?? null} />
              <Row k="Payroll Company" v={emp.companies?.name ?? null} />
              <Row k="Employment Type" v={emp.employment_type} />
              <Row k="Date of Joining" v={emp.date_of_joining} />
              <Row k="Notice Period" v={emp.notice_period} />
              <Row k="Work Week" v={emp.work_week} />
              <Row k="Status" v={emp.status} />
              <Row
                k="Shift"
                v={
                  emp.shifts
                    ? `${emp.shifts.name} (${emp.shifts.login_time?.slice(0, 5)}–${emp.shifts.logout_time?.slice(0, 5)})`
                    : null
                }
              />
            </div>
          )}
          {tab === "salary" && (
            <div className="grid g2" style={{ gap: 10 }}>
              {[
                ["Monthly Gross", inr(emp.monthly_gross)],
                ["Basic", inr(emp.basic)],
                ["HRA", inr(emp.hra)],
                ["Conveyance", inr(emp.conveyance)],
                ["Special Allowance", inr(emp.special_allow)],
                ["Incentive", inr(emp.incentive)],
                ["Bonus", inr(emp.bonus)],
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
          )}
          {tab === "statutory" && (
            <div className="grid" style={{ gap: 10 }}>
              {[
                ["PF Applicable", emp.pf_applicable ? "Yes" : "No"],
                ["PF Number", emp.pf_number],
                ["UAN", emp.uan],
                ["ESIC Applicable", emp.esic_applicable ? "Yes" : "No"],
                ["ESIC Number", emp.esic_number],
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
