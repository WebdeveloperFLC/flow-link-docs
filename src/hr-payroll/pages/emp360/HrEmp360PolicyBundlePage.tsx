import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useEmp360Profile } from "../../context/Emp360ProfileContext";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useWpmsAssignmentHistory, useWpmsAssignments, useWpmsBundles } from "../../hooks/useWpms";
import { assignWpmsBundle } from "../../lib/wpmsApi";

export default function HrEmp360PolicyBundlePage() {
  const { employee } = useEmp360Profile();
  const { can, fire } = useHrAccess();
  const qc = useQueryClient();
  const { data: bundles = [], isLoading: bundlesLoading } = useWpmsBundles();
  const { data: assignments = [], isLoading: assignLoading } = useWpmsAssignments(employee.id);
  const { data: history = [], isLoading: histLoading } = useWpmsAssignmentHistory(employee.id);

  const [bundleId, setBundleId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const canAssign = can("manageEmp") || can("approve");
  const current = assignments.find((a) => a.is_current);
  const bundleMap = useMemo(() => new Map(bundles.map((b) => [b.id, b])), [bundles]);

  const resolveBundleName = (id: string | null) => {
    if (!id) return "—";
    return bundleMap.get(id)?.name ?? id.slice(0, 8);
  };

  const doAssign = async () => {
    if (!bundleId) {
      fire("Select a policy bundle");
      return;
    }
    setSaving(true);
    try {
      await assignWpmsBundle({
        employeeId: employee.id,
        bundleId,
        effectiveFrom,
        reason: reason.trim() || undefined,
      });
      fire("Policy bundle assigned");
      setReason("");
      void qc.invalidateQueries({ queryKey: ["wpms-assignments"] });
      void qc.invalidateQueries({ queryKey: ["wpms-assignment-history"] });
      void qc.invalidateQueries({ queryKey: ["hr-employees"] });
    } catch (e) {
      fire(e instanceof Error ? e.message : "Assignment failed");
    } finally {
      setSaving(false);
    }
  };

  const loading = bundlesLoading || assignLoading || histLoading;

  return (
    <div className="card emp360-detail-panel">
      <div className="card-h emp360-detail-panel-h">
        <h3>Policy bundle</h3>
      </div>

      {loading ? (
        <div className="empty empty-sm">Loading policy bundle…</div>
      ) : (
        <>
          <div className="emp360-detail-panel-filters" style={{ padding: "0 16px 12px" }}>
            <div className="strong">Current assignment</div>
            <div className="muted" style={{ marginTop: 4 }}>
              {current?.wpms_policy_bundles?.name ?? resolveBundleName(current?.bundle_id ?? null)}
              {current?.effective_from ? ` · effective ${current.effective_from}` : ""}
            </div>
            {current?.reason && (
              <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                Reason: {current.reason}
              </div>
            )}
          </div>

          {canAssign && (
            <div className="card" style={{ margin: "0 16px 16px", padding: 16 }}>
              <div className="strong" style={{ marginBottom: 8 }}>Assign / change bundle</div>
              <div className="form-grid" style={{ gap: 12 }}>
                <label>
                  <span className="lbl">Policy bundle</span>
                  <select value={bundleId} onChange={(e) => setBundleId(e.target.value)}>
                    <option value="">Select bundle…</option>
                    {bundles.filter((b) => b.is_active).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (v{b.version})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="lbl">Effective from</span>
                  <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
                </label>
                <label style={{ gridColumn: "1 / -1" }}>
                  <span className="lbl">Reason</span>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Optional reason for audit trail"
                  />
                </label>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 12 }}
                disabled={saving}
                onClick={() => void doAssign()}
              >
                {saving ? "Saving…" : "Assign bundle"}
              </button>
            </div>
          )}

          <div className="table-wrap emp360-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Effective date</th>
                  <th>Previous bundle</th>
                  <th>New bundle</th>
                  <th>Changed by</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      No assignment history yet.
                    </td>
                  </tr>
                ) : (
                  history.map((row) => (
                    <tr key={row.id}>
                      <td>{row.effective_date}</td>
                      <td>{resolveBundleName(row.previous_bundle_id)}</td>
                      <td>{resolveBundleName(row.new_bundle_id)}</td>
                      <td>{row.changed_by_label ?? "—"}</td>
                      <td className="muted">{row.reason ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
