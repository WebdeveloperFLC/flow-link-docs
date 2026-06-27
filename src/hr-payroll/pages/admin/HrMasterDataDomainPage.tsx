import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useHrMasters } from "../../hooks/useHrMasters";
import { masterDomainById } from "../../lib/masterDataRegistry";
import { saveHrMaster } from "../../lib/wpmsApi";
import { MasterFormModal } from "../../components/admin/MasterFormModal";
import type { HrMasterRow } from "../../lib/wpmsTypes";

export default function HrMasterDataDomainPage() {
  const { domain = "" } = useParams();
  const def = masterDomainById(domain);
  const { can, fire } = useHrAccess();
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useHrMasters(def?.domain ?? domain, true);
  const [edit, setEdit] = useState<HrMasterRow | "new" | null>(null);

  if (!def || def.source !== "hr_masters" || !def.domain) {
    return <Navigate to="/hr/admin/master-data" replace />;
  }

  const canWrite = can("configure") || can("manageEmp");

  const toggleActive = async (row: HrMasterRow) => {
    try {
      await saveHrMaster(def.domain!, { label: row.label, is_active: !row.is_active, remarks: row.remarks ?? undefined }, row);
      fire(row.is_active ? "Deactivated" : "Activated");
      void qc.invalidateQueries({ queryKey: ["hr-masters", def.domain] });
    } catch (e) {
      fire(e instanceof Error ? e.message : "Update failed");
    }
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Link to="/hr/admin/master-data" className="btn btn-sm" style={{ alignSelf: "flex-start" }}>← Master Data</Link>
      <div className="card">
        <div className="card-h">
          <h3>{def.title}</h3>
          <span className="tag">{def.domain}</span>
        </div>
        <p className="muted" style={{ fontSize: 13, padding: "0 20px 12px" }}>{def.description}</p>
        {canWrite && (
          <div style={{ padding: "0 20px 12px" }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdit("new")}>+ Add</button>
          </div>
        )}
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Label</th>
                <th>Code</th>
                <th>Order</th>
                <th>Active</th>
                <th>Modified</th>
                {canWrite && <th />}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="muted">Loading…</td></tr>}
              {!isLoading && rows.length === 0 && <tr><td colSpan={6} className="muted">No records.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.label}</strong>{r.remarks && <div className="muted" style={{ fontSize: 11 }}>{r.remarks}</div>}</td>
                  <td>{r.code}</td>
                  <td>{r.display_order}</td>
                  <td>{r.is_active ? "Active" : "Inactive"}</td>
                  <td className="muted" style={{ fontSize: 11 }}>{r.modified_by_label ?? r.created_by_label ?? "—"}</td>
                  {canWrite && (
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button type="button" className="btn btn-sm" onClick={() => setEdit(r)}>Edit</button>
                      <button type="button" className="btn btn-sm" onClick={() => void toggleActive(r)}>
                        {r.is_active ? "Deactivate" : "Activate"}
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
        <MasterFormModal
          title={edit === "new" ? `Add ${def.title}` : `Edit ${def.title}`}
          row={edit === "new" ? null : edit}
          onClose={() => setEdit(null)}
          onSave={(input) => {
            void (async () => {
              try {
                await saveHrMaster(def.domain!, input, edit === "new" ? null : edit);
                fire("Saved");
                setEdit(null);
                void qc.invalidateQueries({ queryKey: ["hr-masters", def.domain] });
              } catch (e) {
                fire(e instanceof Error ? e.message : "Save failed");
              }
            })();
          }}
        />
      )}
    </div>
  );
}
