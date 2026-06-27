import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useWpmsPolicies } from "../../hooks/useWpms";
import { saveWpmsPolicy } from "../../lib/wpmsApi";
import {
  WPMS_DEFAULT_CONFIG,
  WPMS_POLICY_KINDS,
  type WpmsPolicyKind,
  type WpmsPolicyRow,
} from "../../lib/wpmsTypes";
import { ModalShell } from "../../components/ui/ModalShell";

function PolicyModal({
  row,
  kind,
  onClose,
  onSaved,
}: {
  row: WpmsPolicyRow | null;
  kind: WpmsPolicyKind;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(row?.name ?? "");
  const [code, setCode] = useState(row?.code ?? "");
  const [version, setVersion] = useState(row?.version ?? 1);
  const [effectiveFrom, setEffectiveFrom] = useState(row?.effective_from ?? new Date().toISOString().slice(0, 10));
  const [effectiveTo, setEffectiveTo] = useState(row?.effective_to ?? "");
  const [notes, setNotes] = useState(row?.notes ?? "");
  const [configJson, setConfigJson] = useState(JSON.stringify(row?.config ?? WPMS_DEFAULT_CONFIG[kind], null, 2));
  const [err, setErr] = useState("");

  const save = async () => {
    if (!name.trim() || !code.trim()) {
      setErr("Name and code required");
      return;
    }
    let config: Record<string, unknown>;
    try {
      config = JSON.parse(configJson) as Record<string, unknown>;
    } catch {
      setErr("Invalid JSON in config");
      return;
    }
    await saveWpmsPolicy(
      {
        policy_kind: kind,
        name: name.trim(),
        code: code.trim(),
        version,
        effective_from: effectiveFrom,
        effective_to: effectiveTo || null,
        notes: notes || null,
        config,
        is_active: true,
      },
      row,
    );
    onSaved();
  };

  return (
    <ModalShell
      title={row ? "Edit policy" : "New policy"}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => void save().catch((e) => setErr(e.message))}>Save</button>
        </>
      }
    >
      <div className="grid g2">
        <label className="fld"><span className="l">Name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="fld"><span className="l">Code</span><input className="input" value={code} onChange={(e) => setCode(e.target.value)} disabled={!!row} /></label>
        <label className="fld"><span className="l">Version</span><input className="input" type="number" value={version} onChange={(e) => setVersion(Number(e.target.value))} /></label>
        <label className="fld"><span className="l">Effective from</span><input className="input" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} /></label>
        <label className="fld"><span className="l">Effective to</span><input className="input" type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} /></label>
      </div>
      <label className="fld"><span className="l">Notes</span><textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      <label className="fld"><span className="l">Policy config (JSON)</span><textarea className="input" rows={12} value={configJson} onChange={(e) => setConfigJson(e.target.value)} style={{ fontFamily: "monospace", fontSize: 12 }} /></label>
      {err && <p style={{ color: "var(--bad)", fontSize: 12 }}>{err}</p>}
    </ModalShell>
  );
}

export default function WpmsPoliciesPage() {
  const { can, fire } = useHrAccess();
  const qc = useQueryClient();
  const [kindFilter, setKindFilter] = useState<WpmsPolicyKind | "all">("all");
  const { data: policies = [], isLoading } = useWpmsPolicies(kindFilter === "all" ? undefined : kindFilter);
  const [edit, setEdit] = useState<{ row: WpmsPolicyRow | null; kind: WpmsPolicyKind } | null>(null);
  const canWrite = can("configure");

  const grouped = useMemo(() => {
    const m = new Map<WpmsPolicyKind, WpmsPolicyRow[]>();
    for (const p of policies) {
      const list = m.get(p.policy_kind) ?? [];
      list.push(p);
      m.set(p.policy_kind, list);
    }
    return m;
  }, [policies]);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Link to="/hr/admin/wpms" className="btn btn-sm" style={{ alignSelf: "flex-start" }}>← WPMS</Link>
      <div className="card">
        <div className="card-h"><h3>WPMS Policies</h3></div>
        <div style={{ padding: "0 20px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select className="input" style={{ maxWidth: 220 }} value={kindFilter} onChange={(e) => setKindFilter(e.target.value as WpmsPolicyKind | "all")}>
            <option value="all">All kinds</option>
            {WPMS_POLICY_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          {canWrite && WPMS_POLICY_KINDS.map((k) => (
            <button key={k.id} type="button" className="btn btn-sm btn-primary" onClick={() => setEdit({ row: null, kind: k.id })}>+ {k.label}</button>
          ))}
        </div>
        {isLoading && <p className="muted" style={{ padding: 20 }}>Loading…</p>}
        {WPMS_POLICY_KINDS.filter((k) => kindFilter === "all" || kindFilter === k.id).map((k) => (
          <div key={k.id} style={{ padding: "0 20px 16px" }}>
            <h4 style={{ margin: "8px 0" }}>{k.label}</h4>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Name</th><th>Code</th><th>Ver</th><th>Effective</th><th>Active</th>{canWrite && <th />}</tr></thead>
                <tbody>
                  {(grouped.get(k.id) ?? []).map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.code}</td>
                      <td>{p.version}</td>
                      <td>{p.effective_from}{p.effective_to ? ` → ${p.effective_to}` : ""}</td>
                      <td>{p.is_active ? "Yes" : "No"}</td>
                      {canWrite && <td><button type="button" className="btn btn-sm" onClick={() => setEdit({ row: p, kind: p.policy_kind })}>Edit</button></td>}
                    </tr>
                  ))}
                  {(grouped.get(k.id) ?? []).length === 0 && <tr><td colSpan={6} className="muted">None</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      {edit && (
        <PolicyModal
          row={edit.row}
          kind={edit.kind}
          onClose={() => setEdit(null)}
          onSaved={() => {
            fire("Policy saved");
            setEdit(null);
            void qc.invalidateQueries({ queryKey: ["wpms-policies"] });
          }}
        />
      )}
    </div>
  );
}
