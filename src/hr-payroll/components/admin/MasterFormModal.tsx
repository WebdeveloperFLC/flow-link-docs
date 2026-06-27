import { useState } from "react";
import { ModalShell } from "../ui/ModalShell";
import type { HrMasterRow } from "../../lib/wpmsTypes";

export function MasterFormModal({
  title,
  row,
  onClose,
  onSave,
}: {
  title: string;
  row: HrMasterRow | null;
  onClose: () => void;
  onSave: (input: { label: string; code?: string; remarks?: string; is_active: boolean; display_order?: number }) => void;
}) {
  const [label, setLabel] = useState(row?.label ?? "");
  const [code, setCode] = useState(row?.code ?? "");
  const [remarks, setRemarks] = useState(row?.remarks ?? "");
  const [isActive, setIsActive] = useState(row?.is_active ?? true);
  const [displayOrder, setDisplayOrder] = useState(row?.display_order ?? 0);
  const [err, setErr] = useState("");

  const submit = () => {
    if (!label.trim()) {
      setErr("Label is required");
      return;
    }
    setErr("");
    onSave({ label: label.trim(), code: code.trim() || undefined, remarks: remarks.trim() || undefined, is_active: isActive, display_order: displayOrder });
  };

  return (
    <ModalShell
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={submit}>Save</button>
        </>
      }
    >
      <label className="fld">
        <span className="l">Label</span>
        <input className={`input${err ? " err" : ""}`} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} />
      </label>
      {!row && (
        <label className="fld">
          <span className="l">Code (optional)</span>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} maxLength={40} placeholder="Auto-generated if blank" />
        </label>
      )}
      <label className="fld">
        <span className="l">Display order</span>
        <input className="input" type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} />
      </label>
      <label className="fld">
        <span className="l">Remarks</span>
        <textarea className="input" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </label>
      <label className="fld" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        <span className="l" style={{ margin: 0 }}>Active</span>
      </label>
      {err && <p className="muted" style={{ color: "var(--bad)", fontSize: 12 }}>{err}</p>}
    </ModalShell>
  );
}
