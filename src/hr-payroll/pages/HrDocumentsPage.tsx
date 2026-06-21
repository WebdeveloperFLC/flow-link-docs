import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrDocumentTypeLabels } from "../hooks/useHrDocumentTypes";
import { HR_ORG_ID } from "../lib/constants";
import {
  downloadHrDocument,
  getHrDocumentSignedUrl,
} from "../lib/hrStorage";
import type { EmployeeDocumentRow } from "../lib/types";

type DocRow = EmployeeDocumentRow & {
  employees?: { full_name: string; emp_code: string } | null;
};

export default function HrDocumentsPage() {
  const { can, fire } = useHrAccess();
  const docTypeLabels = useHrDocumentTypeLabels();
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["hr-all-documents", HR_ORG_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_documents" as never)
        .select("*, employees(full_name, emp_code)")
        .eq("org_id", HR_ORG_ID)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocRow[];
    },
  });

  const list = useMemo(() => {
    const s = q.toLowerCase();
    return docs.filter((d) => {
      if (typeFilter && d.doc_type !== typeFilter) return false;
      const name = d.employees?.full_name ?? "";
      const code = d.employees?.emp_code ?? "";
      return (
        !s ||
        name.toLowerCase().includes(s) ||
        code.toLowerCase().includes(s) ||
        d.doc_type.toLowerCase().includes(s) ||
        (d.file_name ?? "").toLowerCase().includes(s)
      );
    });
  }, [docs, q, typeFilter]);

  const openDoc = async (storagePath: string | null | undefined, fileName: string) => {
    if (!storagePath) {
      fire("File not available — re-upload from Employee Master");
      return;
    }
    const url = await getHrDocumentSignedUrl(storagePath);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ background: "var(--wash)", borderColor: "var(--line)" }}>
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
          Organization-wide document registry. Upload and manage files from{" "}
          <Link to="/hr/employees">Employee Master</Link> or Employee 360°.
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>All employee documents</h3>
          <span className="tag">{list.length} files</span>
        </div>
        <div className="row-flex" style={{ gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <input
            className="input"
            placeholder="Search employee, code, type, file…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          <select
            className="input"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ maxWidth: 200 }}
          >
            <option value="">All types</option>
            {docTypeLabels.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="empty">Loading documents…</div>
        ) : list.length === 0 ? (
          <div className="empty">
            <div className="ico">📎</div>
            No documents found.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>File</th>
                  <th>Uploaded</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="strong">{d.employees?.full_name ?? "—"}</div>
                      <div className="muted mono" style={{ fontSize: 11 }}>
                        {d.employees?.emp_code}
                      </div>
                    </td>
                    <td>{d.doc_type}</td>
                    <td className="muted" style={{ fontSize: 12.5 }}>
                      {d.file_name ?? "—"}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {d.created_at?.slice(0, 10)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => void openDoc(d.storage_path, d.file_name ?? "document")}
                      >
                        Open
                      </button>
                      {can("export") && d.storage_path && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{ marginLeft: 6 }}
                          onClick={() =>
                            void downloadHrDocument(d.storage_path!, d.file_name ?? "document")
                          }
                        >
                          Download
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
