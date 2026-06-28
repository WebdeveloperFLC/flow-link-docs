import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { EmployeeRow } from "../../lib/types";
import { parseEmergencyContacts } from "../../lib/format";
import { personalEmergencyContact, validatePersonalContact } from "../../lib/employeeContact";
import { updateEssPersonalContact } from "../../lib/hrApi";
import { HR_ORG_ID } from "../../lib/constants";

type Props = {
  emp: EmployeeRow;
  onSaved: (msg: string) => void;
};

export function EssPersonalContactPanel({ emp, onSaved }: Props) {
  const qc = useQueryClient();
  const ec = personalEmergencyContact(emp.emergency_contacts);
  const [email, setEmail] = useState(emp.email ?? "");
  const [mobile, setMobile] = useState(emp.mobile ?? "");
  const [alternateMobile, setAlternateMobile] = useState(emp.alternate_personal_mobile ?? "");
  const [emergencyName, setEmergencyName] = useState(ec.name);
  const [emergencyRelation, setEmergencyRelation] = useState(ec.relation);
  const [emergencyPhone, setEmergencyPhone] = useState(ec.phone);
  const [emergencyEmail, setEmergencyEmail] = useState(ec.email ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const next = personalEmergencyContact(emp.emergency_contacts);
    setEmail(emp.email ?? "");
    setMobile(emp.mobile ?? "");
    setAlternateMobile(emp.alternate_personal_mobile ?? "");
    setEmergencyName(next.name);
    setEmergencyRelation(next.relation);
    setEmergencyPhone(next.phone);
    setEmergencyEmail(next.email ?? "");
  }, [emp]);

  const save = async () => {
    const err = validatePersonalContact({
      email,
      mobile,
      alternate_personal_mobile: alternateMobile,
      emergency_contacts: parseEmergencyContacts([
        { name: emergencyName, phone: emergencyPhone, relation: emergencyRelation, email: emergencyEmail },
      ]),
    });
    if (err) {
      onSaved(err);
      return;
    }
    setBusy(true);
    try {
      await updateEssPersonalContact({
        email: email.trim(),
        mobile: mobile.trim(),
        alternateMobile: alternateMobile.trim() || undefined,
        emergencyName: emergencyName.trim(),
        emergencyRelation: emergencyRelation.trim(),
        emergencyPhone: emergencyPhone.trim(),
        emergencyEmail: emergencyEmail.trim() || undefined,
      });
      await qc.invalidateQueries({ queryKey: ["hr-employees", HR_ORG_ID] });
      onSaved("Personal contact information saved");
    } catch (e) {
      onSaved(e instanceof Error ? e.message : "Save failed — apply migration 20260739120000");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="sec-label" style={{ marginBottom: 4 }}>
        Personal contact information
      </div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
        You can update your personal contact details. Company contact information is managed by HR.
      </p>
      <div className="grid g2" style={{ gap: "0 16px" }}>
        <label className="fld">
          <span className="l">Personal Email Address *</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="fld">
          <span className="l">Personal Mobile Number *</span>
          <input className="input" value={mobile} onChange={(e) => setMobile(e.target.value)} />
        </label>
        <label className="fld">
          <span className="l">Alternate Personal Mobile Number</span>
          <input className="input" value={alternateMobile} onChange={(e) => setAlternateMobile(e.target.value)} />
        </label>
      </div>
      <div className="sec-label" style={{ marginTop: 16, marginBottom: 8 }}>
        Personal emergency contact
      </div>
      <div className="grid g2" style={{ gap: "0 16px" }}>
        <label className="fld">
          <span className="l">Contact Person *</span>
          <input className="input" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
        </label>
        <label className="fld">
          <span className="l">Relationship *</span>
          <input className="input" value={emergencyRelation} onChange={(e) => setEmergencyRelation(e.target.value)} />
        </label>
        <label className="fld">
          <span className="l">Contact Number *</span>
          <input className="input" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
        </label>
        <label className="fld">
          <span className="l">Contact Email</span>
          <input
            className="input"
            type="email"
            value={emergencyEmail}
            onChange={(e) => setEmergencyEmail(e.target.value)}
          />
        </label>
      </div>
      <div className="sec-label" style={{ marginTop: 16, marginBottom: 8 }}>
        Official company contact information
      </div>
      <div className="grid g2" style={{ gap: "8px 16px", fontSize: 13 }}>
        <div>
          <span className="muted">Company Email</span>
          <div>{emp.company_email || "—"}</div>
        </div>
        <div>
          <span className="muted">Company Mobile</span>
          <div>{emp.company_mobile || "—"}</div>
        </div>
        <div>
          <span className="muted">Extension</span>
          <div>{emp.extension_number || "—"}</div>
        </div>
        <div>
          <span className="muted">Direct Office Number</span>
          <div>{emp.direct_office_number || "—"}</div>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save personal contact"}
        </button>
      </div>
    </div>
  );
}
