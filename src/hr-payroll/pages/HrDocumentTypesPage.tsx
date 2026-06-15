import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrDocumentTypes } from "../hooks/useHrDocumentTypes";
import { ModalShell } from "../components/ui/ModalShell";
import { HR_ORG_ID } from "../lib/constants";
import { hrAudit } from "../lib/hrApi";
import type { HrDocumentTypeRow } from "../lib/types";

function slugify(label: string): string {
  const s = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return s || "document_type";
}

function DocTypeModal({
  row,
  onClose,
  onSaved,
}: {
  row: HrDocumentTypeRow | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [label, setLabel] = useState(row?.label ?? "");
  const [err, setErr] = useState("");

  const save = async () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setErr("Label is required");
      return;
    }
    setErr("");

    if (row) {
      const { error } = await supabase
        .from("hr_document_types" as never)
        .update({ label: trimmed } as never)
        .eq("id", row.id);
      if (error) {
        onSaved(error.message);
        return;
      }
      await hrAudit("Document Type Updated", trimmed, row.label, trimmed);
      onSaved("Document type updated");
    } else {
      const { data: maxRow } = await supabase
        .from("hr_document_types" as never)
        .select("sort_order")
        .eq("org_id", HR_ORG_ID)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const sortOrder = ((maxRow as { sort_order?: number } | null)?.sort_order ?? 0) + 10;
      const code = slugify(trimmed);

      const { error } = await supabase.from("hr_document_types" as never).insert({
        org_id: HR_ORG_ID,
        label: trimmed,
        code,
        sort_order: sortOrder,
        is_active: true,
      } as never);
      if (error) {
        onSaved(error.message);
        return;
      }
      await hrAudit("Document Type Added", trimmed);
      onSaved("Document type added");
    }
    onClose();
  };

  return (
    <ModalShell
      title={row ? "Edit document type" : "Add document type"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void save()}>
            Save
          </button>
        </>
      }
    >
      <label className="fld">
        <span className="l">Label (shown in employee upload dropdown)</span>
        <input
          className={`input${err ? " err" : ""}`}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Experience Letter"
          maxLength={80}
        />
      </label>
      {err && <p className="muted" style={{ fontSize: 12, color: "var(--bad)" }}>{err}</p>}
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        Existing employee files keep their type label even if you rename or deactivate a type here.
      </p>
    </ModalShell>
  );
}

export default function HrDocumentTypesPage() {
  const { can, fire } = useHrAccess();
  const qc = useQueryClient();
  const { data: types = [], isLoading } = useHrDocumentTypes(false);
  const [edit, setEdit] = useState<HrDocumentTypeRow | "new" | null>(null);
  const mng = can("manageEmp") || can("configure");

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["hr-document-types"] });
  };

  const toggleActive = async (row: HrDocumentTypeRow) => {
    const { error } = await supabase
      .from("hr_document_types" as never)
      .update({ is_active: !row.is_active } as never)
      .eq("id", row.id);
    if (error) {
      fire(error.message);
      return;
    }
    await hrAudit(
      row.is_active ? "Document Type Deactivated" : "Document Type Activated",
      row.label,
    );
    fire(row.is_active ? "Deactivated" : "Activated");
    await refresh();
  };

  const onSaved = async (msg: string) => {
    fire(msg);
    await refresh();
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card-h">
        <div>
          <span className="tag">Employee document categories</span>
          <p className="muted" style={{ fontSize: 12, marginTop: 6, maxWidth: 520 }}>
            Types listed here appear in <strong>Employee Master → Documents</strong> when HR uploads
            files (Offer Letter, Form 16, etc.).
          </p>
        </div>
        {mng && (
          <button type="button" className="btn btn-primary" onClick={() => setEdit("new")}>
            + Add type
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="empty">Loading…</div>
      ) : types.length === 0 ? (
        <div className="empty">
          <div className="ico">📄</div>
          No document types yet.
          {mng && (
            <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setEdit("new")}>
              Add first type
            </button>
          )}
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Label</th>
              <th>Code</th>
              <th>Order</th>
              <th>Status</th>
              {mng && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id}>
                <td>{t.label}</td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {t.code}
                </td>
                <td className="mono">{t.sort_order}</td>
                <td>
                  <span className={`badge ${t.is_active ? "b-good" : "b-muted"}`}>
                    {t.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                {mng && (
                  <td>
                    <div className="row-flex">
                      <button type="button" className="btn btn-sm" onClick={() => setEdit(t)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => void toggleActive(t)}>
                        {t.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {edit && (
        <DocTypeModal
          row={edit === "new" ? null : edit}
          onClose={() => setEdit(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
