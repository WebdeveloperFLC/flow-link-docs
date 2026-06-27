import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useCompaniesAdmin } from "../../hooks/useWpms";
import { saveCompanyAdmin } from "../../lib/wpmsApi";
import { ModalShell } from "../../components/ui/ModalShell";

type CompanyRow = {
  id: string;
  name: string;
  legal_name: string | null;
  currency: string | null;
  country: string | null;
  is_active: boolean;
};

function CompanyModal({
  row,
  onClose,
  onSaved,
}: {
  row: CompanyRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(row?.name ?? "");
  const [legalName, setLegalName] = useState(row?.legal_name ?? "");
  const [currency, setCurrency] = useState(row?.currency ?? "INR");
  const [country, setCountry] = useState(row?.country ?? "IN");
  const [isActive, setIsActive] = useState(row?.is_active ?? true);

  return (
    <ModalShell
      title={row ? "Edit company" : "Add company"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              void saveCompanyAdmin(
                { name, legal_name: legalName, currency, country, is_active: isActive },
                row?.id,
              ).then(onSaved).catch(() => onSaved());
            }}
          >
            Save
          </button>
        </>
      }
    >
      <label className="fld"><span className="l">Name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="fld"><span className="l">Legal name</span><input className="input" value={legalName} onChange={(e) => setLegalName(e.target.value)} /></label>
      <label className="fld"><span className="l">Currency</span><input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} /></label>
      <label className="fld"><span className="l">Country</span><input className="input" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={2} /></label>
      <label className="fld" style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        <span className="l" style={{ margin: 0 }}>Active</span>
      </label>
    </ModalShell>
  );
}

export default function HrCompaniesAdminPage() {
  const { can, fire } = useHrAccess();
  const qc = useQueryClient();
  const { data: companies = [], isLoading } = useCompaniesAdmin();
  const [edit, setEdit] = useState<CompanyRow | "new" | null>(null);
  const canWrite = can("configure");

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Link to="/hr/admin/master-data" className="btn btn-sm" style={{ alignSelf: "flex-start" }}>← Master Data</Link>
      <div className="card">
        <div className="card-h"><h3>Companies</h3><span className="tag">Organization</span></div>
        {canWrite && (
          <div style={{ padding: "0 20px 12px" }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdit("new")}>+ Add company</button>
          </div>
        )}
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Legal</th><th>Currency</th><th>Country</th><th>Active</th>{canWrite && <th />}</tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="muted">Loading…</td></tr>}
              {(companies as CompanyRow[]).map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.legal_name ?? "—"}</td>
                  <td>{c.currency ?? "—"}</td>
                  <td>{c.country ?? "—"}</td>
                  <td>{c.is_active ? "Yes" : "No"}</td>
                  {canWrite && <td><button type="button" className="btn btn-sm" onClick={() => setEdit(c)}>Edit</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {edit && (
        <CompanyModal
          row={edit === "new" ? null : edit}
          onClose={() => setEdit(null)}
          onSaved={() => {
            fire("Saved");
            setEdit(null);
            void qc.invalidateQueries({ queryKey: ["hr-companies-admin"] });
          }}
        />
      )}
    </div>
  );
}
