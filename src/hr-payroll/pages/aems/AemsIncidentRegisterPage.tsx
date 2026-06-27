import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useHrMasters } from "../../hooks/useHrMasters";
import { useWorkforceIncidents } from "../../hooks/useAems";
import { closeWorkforceIncident, saveWorkforceIncident } from "../../lib/aemsApi";
import { ModalShell } from "../../components/ui/ModalShell";

export default function AemsIncidentRegisterPage() {
  const { can, fire } = useHrAccess();
  const qc = useQueryClient();
  const { data: incidents = [], isLoading } = useWorkforceIncidents();
  const { data: types = [] } = useHrMasters("workforce_incident_type", true);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    incident_code: "",
    branch_id: "",
    start_at: "",
    end_at: "",
    incident_type_code: types[0]?.code ?? "other",
    description: "",
  });

  const canManage = can("configure") || can("manageEmp");

  const save = async () => {
    if (!f.description.trim() || !f.start_at) {
      fire("Description and start time required");
      return;
    }
    try {
      await saveWorkforceIncident({
        incident_code: f.incident_code || undefined,
        branch_id: f.branch_id || null,
        start_at: new Date(f.start_at).toISOString(),
        end_at: f.end_at ? new Date(f.end_at).toISOString() : null,
        incident_type_code: f.incident_type_code,
        description: f.description.trim(),
      });
      fire("Incident recorded");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["workforce-incidents"] });
    } catch (e) {
      fire(e instanceof Error ? e.message : "Save failed");
    }
  };

  const closeIncident = async (id: string) => {
    try {
      await closeWorkforceIncident(id);
      fire("Incident closed");
      void qc.invalidateQueries({ queryKey: ["workforce-incidents"] });
    } catch (e) {
      fire(e instanceof Error ? e.message : "Close failed");
    }
  };

  return (
    <div className="page-grid">
      <Link to="/hr/admin" className="btn btn-sm">← Administration</Link>
      <div className="card">
        <div className="card-h">
          <h3>Workforce Incident Register</h3>
          {canManage && (
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setOpen(true)}>+ Record incident</button>
          )}
        </div>
        <p className="muted" style={{ padding: "0 16px 12px", fontSize: 13 }}>
          Office-wide operational incidents (internet, power, server). Employees may link exceptions — HR approves independently.
        </p>
        {isLoading ? (
          <div className="empty empty-sm">Loading incidents…</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th>Description</th>
                  <th>Created by</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {incidents.length === 0 ? (
                  <tr><td colSpan={8} className="muted">No incidents recorded.</td></tr>
                ) : incidents.map((i) => (
                  <tr key={i.id}>
                    <td className="mono">{i.incident_code}</td>
                    <td>{i.incident_type_code}</td>
                    <td>{i.start_at.slice(0, 16).replace("T", " ")}</td>
                    <td>{i.end_at ? i.end_at.slice(0, 16).replace("T", " ") : "—"}</td>
                    <td>{i.status}</td>
                    <td className="muted">{i.description.slice(0, 80)}</td>
                    <td>{i.created_by_label ?? "—"}</td>
                    <td>
                      {canManage && i.status !== "Closed" && (
                        <button type="button" className="btn btn-sm" onClick={() => void closeIncident(i.id)}>Close</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <ModalShell
          title="Record workforce incident"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={() => void save()}>Save</button>
            </>
          }
        >
          <label className="fld">
            <span className="l">Incident ID (optional)</span>
            <input className="input" value={f.incident_code} onChange={(e) => setF({ ...f, incident_code: e.target.value })} placeholder="Auto-generated if blank" />
          </label>
          <label className="fld">
            <span className="l">Type</span>
            <select className="input" value={f.incident_type_code} onChange={(e) => setF({ ...f, incident_type_code: e.target.value })}>
              {types.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
            </select>
          </label>
          <label className="fld">
            <span className="l">Start</span>
            <input className="input" type="datetime-local" value={f.start_at} onChange={(e) => setF({ ...f, start_at: e.target.value })} />
          </label>
          <label className="fld">
            <span className="l">End (optional)</span>
            <input className="input" type="datetime-local" value={f.end_at} onChange={(e) => setF({ ...f, end_at: e.target.value })} />
          </label>
          <label className="fld">
            <span className="l">Description</span>
            <textarea className="input" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </label>
        </ModalShell>
      )}
    </div>
  );
}
