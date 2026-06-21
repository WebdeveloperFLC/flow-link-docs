import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useHrDocuments } from "../../hooks/useHrRequests";
import { useHrDocumentTypeLabels } from "../../hooks/useHrDocumentTypes";
import {
  deleteHrDocument,
  downloadHrDocument,
  getHrDocumentSignedUrl,
  uploadHrDocument,
} from "../../lib/hrStorage";
import { hrAudit } from "../../lib/hrApi";
import { StatusBadge } from "../ui/StatusBadge";
import type { EmployeeDocumentRow, EmployeeRow } from "../../lib/types";

export function EmployeeDocumentsPanel({
  emp,
  essOnly = false,
}: {
  emp: EmployeeRow;
  essOnly?: boolean;
}) {
  const { can, fire } = useHrAccess();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const docTypeLabels = useHrDocumentTypeLabels();
  const [docType, setDocType] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const { data: docs = [], isLoading } = useHrDocuments(emp.id);

  useEffect(() => {
    if (!docType && docTypeLabels.length) setDocType(docTypeLabels[0]);
    if (docType && docTypeLabels.length && !docTypeLabels.includes(docType)) {
      setDocType(docTypeLabels[0]);
    }
  }, [docTypeLabels, docType]);

  const canManage = can("manageEmp") && !essOnly;

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
      fire(essOnly ? "File not available yet — ask HR to re-upload" : "Metadata only — re-upload file to open");
      return;
    }
    try {
      const url = await getHrDocumentSignedUrl(storagePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      fire(e instanceof Error ? e.message : "Could not open file");
    }
  };

  const saveDoc = async (storagePath: string | null | undefined, fileName: string) => {
    if (!storagePath) {
      fire(essOnly ? "File not available yet — ask HR to re-upload" : "Metadata only — re-upload file to download");
      return;
    }
    try {
      await downloadHrDocument(storagePath, fileName || "document");
    } catch (e) {
      fire(e instanceof Error ? e.message : "Could not download file");
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

  const verifyDoc = async (doc: EmployeeDocumentRow, status: "Verified" | "Rejected") => {
    const remarks =
      status === "Rejected"
        ? window.prompt("Rejection remarks (optional)") ?? ""
        : "";
    const { error } = await supabase
      .from("employee_documents" as never)
      .update({
        verification_status: status,
        remarks: remarks || null,
        verified_at: new Date().toISOString(),
      } as never)
      .eq("id", doc.id);
    if (error) {
      fire(error.message);
      return;
    }
    await hrAudit(`Document ${status}`, `${emp.emp_code} · ${doc.doc_type}`);
    fire(`Document ${status.toLowerCase()}`);
    await qc.invalidateQueries({ queryKey: ["hr-documents", emp.id] });
  };

  return (
    <div className="grid" style={{ gap: 14 }}>
      {canManage && (
        <div
          className="card"
          style={{ background: "var(--paper)", padding: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}
        >
          <select className="input" value={docType} onChange={(e) => setDocType(e.target.value)} style={{ maxWidth: 200 }}>
            {docTypeLabels.map((t) => (
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
            disabled={uploading || !docType}
            onChange={(e) => void onUpload(e.target.files?.[0])}
          />
          {uploading && <span className="muted" style={{ fontSize: 12 }}>Uploading…</span>}
          {(can("configure") || can("manageEmp")) && (
            <Link to="/hr/config" className="muted" style={{ fontSize: 12 }}>
              Configuration → Document types
            </Link>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="empty">Loading documents…</div>
      ) : docs.length === 0 ? (
        <div className="empty">
          <div className="ico">📄</div>
          No documents on file.
        </div>
      ) : essOnly ? (
        <div className="grid" style={{ gap: 8 }}>
          {docs.map((d) => (
            <div
              key={d.id}
              className="row-flex"
              style={{
                justifyContent: "space-between",
                padding: "10px 12px",
                background: "var(--paper)",
                borderRadius: 10,
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{d.doc_type}</div>
                <div className="mono muted" style={{ fontSize: 11, marginTop: 2 }}>
                  {d.file_name ?? "—"}
                  {!d.storage_path && (
                    <span className="tag" style={{ marginLeft: 6 }}>
                      awaiting file
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 4 }}>
                  <StatusBadge status={d.verification_status ?? "Uploaded"} />
                </div>
              </div>
              <div className="row-flex" style={{ gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={!d.storage_path}
                  onClick={() => void openDoc(d.storage_path, d.file_name ?? d.doc_type)}
                >
                  View
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={!d.storage_path}
                  onClick={() => void saveDoc(d.storage_path, d.file_name ?? d.doc_type)}
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>File</th>
              <th>Verification</th>
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
                  <StatusBadge status={d.verification_status ?? "Uploaded"} />
                  {d.remarks && (
                    <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>
                      {d.remarks}
                    </div>
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
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={!d.storage_path}
                      onClick={() => void saveDoc(d.storage_path, d.file_name ?? d.doc_type)}
                    >
                      Download
                    </button>
                    {canManage && (d.verification_status ?? "Uploaded") === "Uploaded" && (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-good"
                          onClick={() => void verifyDoc(d, "Verified")}
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-bad"
                          onClick={() => void verifyDoc(d, "Rejected")}
                        >
                          Reject
                        </button>
                      </>
                    )}
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
