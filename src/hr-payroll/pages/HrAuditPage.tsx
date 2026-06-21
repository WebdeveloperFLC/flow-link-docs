import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useHrAuditLogs } from "../hooks/useHrRequests";
import type { AuditLogRow } from "../lib/types";

export default function HrAuditPage() {
  const { data: logs = [], isLoading } = useHrAuditLogs();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const s = q.toLowerCase();
    return (logs as AuditLogRow[]).filter(
      (a) =>
        a.action.toLowerCase().includes(s) ||
        (a.target ?? "").toLowerCase().includes(s) ||
        (a.actor_label ?? "").toLowerCase().includes(s),
    );
  }, [logs, q]);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Link to="/hr/config" className="btn btn-sm" style={{ alignSelf: "flex-start" }}>
        ← Configuration hub
      </Link>
      <div className="card-h">
        <span className="tag">{logs.length} entries · live</span>
        <input
          className="input"
          style={{ maxWidth: 240 }}
          placeholder="Search logs…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        {isLoading ? (
          <div className="empty">Loading…</div>
        ) : (
          <table style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Target</th>
                <th>Previous</th>
                <th>New</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="strong">{a.actor_label ?? "—"}</td>
                  <td>
                    <span className="tag">{a.action}</span>
                  </td>
                  <td style={{ fontSize: 12.5 }}>{a.target ?? "—"}</td>
                  <td className="muted mono" style={{ fontSize: 12 }}>
                    {a.prev_value ?? "—"}
                  </td>
                  <td className="mono" style={{ fontSize: 12, color: "var(--moss)" }}>
                    {a.new_value ?? "—"}
                  </td>
                  <td className="muted mono" style={{ fontSize: 12 }}>
                    {new Date(a.created_at).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
