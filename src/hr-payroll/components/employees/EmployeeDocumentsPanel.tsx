import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useHrDocuments } from "../../hooks/useHrRequests";
import {
  deleteHrDocument,
  getHrDocumentSignedUrl,
  HR_DOC_TYPES,
  uploadHrDocument,
} from "../../lib/hrStorage";
import { hrAudit } from "../../lib/hrApi";
import type { EmployeeRow } from "../../lib/types";

export function EmployeeDocumentsPanel({ emp }: { emp: EmployeeRow }) {
  const { can, fire } = useHrAccess();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<string>(HR_DOC_TYPES[0]);
  const [uploading, setUploading] = useState(false);
  const { data: docs = [], isLoading } = useHrDocuments(emp.id);

  const canManage = can("manageEmp");

  const onUpload = async (file: File | undefined) => {
    if (!file || !canManage) return;
    setUploading(true);
    try {
      await uploadHrDocument(emp.id, file, docType);
      await hrAudit("Document Uploaded", `${emp.emp_code} · ${docType}`, "—", file.name);
      fire(`Uploaded ${file.name}`);
      await qc.invalidateQueries({ queryKey: ["hr-documents", emp.id] });
    } catch (e) {
      fire(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openDoc = async (storagePath: string | null | undefined, fileName: string) => {
    if (!storagePath) {
      fire("Metadata only — re-upload file to open");
      return;
    }
    try {
      const url = await getHrDocumentSignedUrl(storagePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      fire(e instanceof Error ? e.message : "Could not open file");
    }
  };

  const remove = async (docId: string, storagePath: string | null | undefined, label: string) => {
    if (!canManage || !confirm(`Remove ${label}?`)) return;
    try {
      await deleteHrDocument(docId, storagePath ?? null);
      fire("Document removed");
      await qc.invalidateQueries({ queryKey: ["hr-documents", emp.id] });
    } catch (e) {
      fire(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="grid" style={{ gap: 14 }}>
      {canManage && (
        <div
          className="card"
          style={{ background: "var(--paper)", padding: 14, display: "flex", gap: 10, flexWrap: "wrap" }}
        >
          <select className="input" value={docType} onChange={(e) => setDocType(e.target.value)} style={{ maxWidth: 200 }}>
            {HR_DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            style={{ maxWidth: 260 }}
            disabled={uploading}
            onChange={(e) => void onUpload(e.target.files?.[0])}
          />
          {uploading && <span className="muted" style={{ fontSize: 12 }}>Uploading…</span>}
        </div>
      )}

      {isLoading ? (
        <div className="empty">Loading documents…</div>
      ) : docs.length === 0 ? (
        <div className="empty">
          <div className="ico">📄</div>
          No documents on file.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>File</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td>{d.doc_type}</td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {d.file_name ?? "—"}
                  {!d.storage_path && (
                    <span className="tag" style={{ marginLeft: 6 }}>
                      metadata
                    </span>
                  )}
                </td>
                <td>
                  <div className="row-flex">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => void openDoc(d.storage_path, d.file_name ?? d.doc_type)}
                    >
                      Open
                    </button>
                    {canManage && (
                      <button
                        type="button"
                        className="btn btn-sm btn-bad"
                        onClick={() => void remove(d.id, d.storage_path, d.doc_type)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
