import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
import { useHrMasters } from "../hooks/useHrMasters";
import { useAemsExceptions, useAemsHistory, useMatchingIncidents } from "../hooks/useAems";
import { aemsHrAction, submitAemsException, uploadAemsEvidence } from "../lib/aemsApi";
import { AEMS_STATUS_LABEL } from "../lib/aemsTypes";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ModalShell } from "../components/ui/ModalShell";

function ExceptionSubmitModal({
  employeeId,
  branchId,
  onClose,
  onSaved,
}: {
  employeeId: string;
  branchId: string | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const { data: types = [] } = useHrMasters("attendance_exception_type", true);
  const { data: matching = [] } = useMatchingIncidents(branchId);
  const [f, setF] = useState({
    work_date: new Date().toISOString().slice(0, 10),
    exception_type_code: types[0]?.code ?? "other",
    requested_clock_in: "",
    requested_clock_out: "",
    description: "",
    incident_id: "",
  });
  const [files, setFiles] = useState<File[]>([]);

  const save = async () => {
    if (!f.description.trim()) {
      onSaved("Description is required");
      return;
    }
    try {
      const ex = await submitAemsException({
        employeeId,
        workDate: f.work_date,
        exceptionTypeCode: f.exception_type_code,
        description: f.description.trim(),
        requestedClockIn: f.requested_clock_in || null,
        requestedClockOut: f.requested_clock_out || null,
        incidentId: f.incident_id || null,
      });
      for (const file of files) {
        await uploadAemsEvidence(ex.id, employeeId, file);
      }
      onSaved("Exception submitted");
      onClose();
    } catch (e) {
      onSaved(e instanceof Error ? e.message : "Submit failed");
    }
  };

  return (
    <ModalShell
      title="Submit Attendance Exception"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => void save()}>Submit</button>
        </>
      }
    >
      {matching.length > 0 && (
        <div className="ess-punch-alert" style={{ marginBottom: 12 }}>
          Matching Workforce Incident Found — you may link below (HR still reviews independently).
        </div>
      )}
      <label className="fld">
        <span className="l">Date</span>
        <input className="input" type="date" value={f.work_date} onChange={(e) => setF({ ...f, work_date: e.target.value })} />
      </label>
      <label className="fld">
        <span className="l">Exception type</span>
        <select className="input" value={f.exception_type_code} onChange={(e) => setF({ ...f, exception_type_code: e.target.value })}>
          {types.map((t) => (
            <option key={t.code} value={t.code}>{t.label}</option>
          ))}
        </select>
      </label>
      <div className="grid g2">
        <label className="fld">
          <span className="l">Requested clock in</span>
          <input className="input" type="time" value={f.requested_clock_in} onChange={(e) => setF({ ...f, requested_clock_in: e.target.value })} />
        </label>
        <label className="fld">
          <span className="l">Requested clock out</span>
          <input className="input" type="time" value={f.requested_clock_out} onChange={(e) => setF({ ...f, requested_clock_out: e.target.value })} />
        </label>
      </div>
      <label className="fld">
        <span className="l">Description</span>
        <textarea className="input" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      </label>
      {matching.length > 0 && (
        <label className="fld">
          <span className="l">Link incident (optional)</span>
          <select className="input" value={f.incident_id} onChange={(e) => setF({ ...f, incident_id: e.target.value })}>
            <option value="">None</option>
            {matching.map((m) => (
              <option key={m.id} value={m.id}>{m.incident_code} · {m.incident_type_code}</option>
            ))}
          </select>
        </label>
      )}
      <label className="fld">
        <span className="l">Evidence (photos / documents)</span>
        <input className="input" type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
      </label>
    </ModalShell>
  );
}

function HrReviewModal({
  row,
  onClose,
  onSaved,
}: {
  row: { id: string; requested_clock_in: string | null; requested_clock_out: string | null };
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [action, setAction] = useState<"approve" | "approve_modified" | "reject" | "clarify">("approve");
  const [comment, setComment] = useState("");
  const [clockIn, setClockIn] = useState(row.requested_clock_in?.slice(0, 5) ?? "");
  const [clockOut, setClockOut] = useState(row.requested_clock_out?.slice(0, 5) ?? "");

  const save = async () => {
    if (!comment.trim()) {
      onSaved("Comment is required");
      return;
    }
    try {
      await aemsHrAction({
        exceptionId: row.id,
        action,
        comment: comment.trim(),
        modifiedClockIn: action === "approve_modified" ? clockIn : null,
        modifiedClockOut: action === "approve_modified" ? clockOut : null,
      });
      onSaved("Review saved");
      onClose();
    } catch (e) {
      onSaved(e instanceof Error ? e.message : "Action failed");
    }
  };

  return (
    <ModalShell
      title="Review Exception"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => void save()}>Confirm</button>
        </>
      }
    >
      <label className="fld">
        <span className="l">Action</span>
        <select className="input" value={action} onChange={(e) => setAction(e.target.value as typeof action)}>
          <option value="approve">Approve</option>
          <option value="approve_modified">Approve with modified time</option>
          <option value="reject">Reject</option>
          <option value="clarify">Return for clarification</option>
        </select>
      </label>
      {action === "approve_modified" && (
        <div className="grid g2">
          <label className="fld">
            <span className="l">Approved clock in</span>
            <input className="input" type="time" value={clockIn} onChange={(e) => setClockIn(e.target.value)} />
          </label>
          <label className="fld">
            <span className="l">Approved clock out</span>
            <input className="input" type="time" value={clockOut} onChange={(e) => setClockOut(e.target.value)} />
          </label>
        </div>
      )}
      <label className="fld">
        <span className="l">Comments (required)</span>
        <textarea className="input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
    </ModalShell>
  );
}

export default function AemsEssExceptionsPage() {
  const { user } = useAuth();
  const { fire } = useHrAccess();
  const qc = useQueryClient();
  const { data: employees = [] } = useHrEmployees();
  const emp = employees.find((e) => e.staff_id === user?.id);
  const { data: rows = [], isLoading } = useAemsExceptions({ employeeId: emp?.id });
  const [submitOpen, setSubmitOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data: history = [] } = useAemsHistory(detailId ?? undefined);

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["aems-exceptions"] });

  if (!emp) {
    return <div className="empty">Employee profile required. <Link to="/hr/me">My Portal →</Link></div>;
  }

  return (
    <div className="page-grid">
      <Link to="/hr/me" className="btn btn-sm">← My Portal</Link>
      <div className="card">
        <div className="card-h">
          <h3>My attendance exceptions</h3>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setSubmitOpen(true)}>+ New exception</button>
        </div>
        {isLoading ? (
          <div className="empty empty-sm">Loading…</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Requested in/out</th>
                  <th>Comment</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={6} className="muted">No exceptions yet.</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.work_date}</td>
                    <td>{r.exception_type_code}</td>
                    <td><StatusBadge status={AEMS_STATUS_LABEL[r.status]} /></td>
                    <td className="mono">{r.requested_clock_in?.slice(0, 5) ?? "—"} / {r.requested_clock_out?.slice(0, 5) ?? "—"}</td>
                    <td className="muted">{r.latest_comment ?? "—"}</td>
                    <td><button type="button" className="btn btn-sm" onClick={() => setDetailId(r.id)}>Details</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {submitOpen && (
        <ExceptionSubmitModal
          employeeId={emp.id}
          branchId={emp.branch_id ?? null}
          onClose={() => setSubmitOpen(false)}
          onSaved={(m) => { fire(m); invalidate(); }}
        />
      )}

      {detailId && (
        <ModalShell title="Exception history" onClose={() => setDetailId(null)} footer={<button type="button" className="btn" onClick={() => setDetailId(null)}>Close</button>}>
          <div className="emp360-timeline">
            {history.map((h) => (
              <div key={h.id} className="emp360-timeline-row">
                <span className="mono muted">{h.created_at.slice(0, 10)}</span>
                <span>{h.action}</span>
                <span className="muted">{h.comment ?? ""}</span>
              </div>
            ))}
          </div>
        </ModalShell>
      )}
    </div>
  );
}

export function AemsHrReviewPage() {
  const { can, fire } = useHrAccess();
  const qc = useQueryClient();
  const { data: employees = [] } = useHrEmployees();
  const { data: types = [] } = useHrMasters("attendance_exception_type", true);
  const [statusFilter, setStatusFilter] = useState("Submitted");
  const [branchFilter, setBranchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [reviewRow, setReviewRow] = useState<{ id: string; requested_clock_in: string | null; requested_clock_out: string | null } | null>(null);
  const [bulkComment, setBulkComment] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ employee_id: "", work_date: "", clock_in: "", clock_out: "", reason: "", comment: "" });

  const { data: rows = [], isLoading } = useAemsExceptions({
    status: statusFilter || undefined,
    branchId: branchFilter || undefined,
  });

  const filtered = useMemo(
    () => rows.filter((r) => !typeFilter || r.exception_type_code === typeFilter),
    [rows, typeFilter],
  );

  const branches = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) {
      if (e.branch_id && e.branches?.name) m.set(e.branch_id, e.branches.name);
    }
    return [...m.entries()];
  }, [employees]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["aems-exceptions"] });
    void qc.invalidateQueries({ queryKey: ["wtm-session"] });
    void qc.invalidateQueries({ queryKey: ["hr-attendance"] });
  };

  const canReview = can("approve") || can("manageEmp");

  const doBulk = async (action: "approve" | "reject") => {
    if (!selected.length || !bulkComment.trim()) {
      fire("Select rows and enter comment");
      return;
    }
    try {
      const { aemsBulkProcess } = await import("../lib/aemsApi");
      const res = await aemsBulkProcess(selected, action, bulkComment.trim());
      fire(`Bulk ${action}: ${res.count} exceptions`);
      setSelected([]);
      invalidate();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Bulk failed");
    }
  };

  const doManual = async () => {
    try {
      const { aemsManualAttendance } = await import("../lib/aemsApi");
      await aemsManualAttendance({
        employeeId: manual.employee_id,
        workDate: manual.work_date,
        clockIn: manual.clock_in,
        clockOut: manual.clock_out,
        reason: manual.reason,
        comment: manual.comment,
      });
      fire("Manual attendance recorded");
      setManualOpen(false);
      invalidate();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Manual attendance failed");
    }
  };

  return (
    <div className="page-grid">
      <div className="card">
        <div className="card-h">
          <h3>HR Exception Review Queue</h3>
          {canReview && (
            <button type="button" className="btn btn-sm" onClick={() => setManualOpen(true)}>Manual attendance</button>
          )}
        </div>
        <div className="row-flex" style={{ gap: 8, flexWrap: "wrap", padding: "0 16px 12px" }}>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {["Submitted", "Under Review", "Returned for Clarification", "Approved", "Rejected"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="input" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="">All branches</option>
            {branches.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t.code} value={t.code}>{t.label}</option>
            ))}
          </select>
        </div>
        {canReview && (
          <div className="row-flex" style={{ gap: 8, padding: "0 16px 12px" }}>
            <input className="input" placeholder="Bulk comment (required)" value={bulkComment} onChange={(e) => setBulkComment(e.target.value)} style={{ flex: 1 }} />
            <button type="button" className="btn btn-sm" onClick={() => void doBulk("approve")}>Bulk approve</button>
            <button type="button" className="btn btn-sm" onClick={() => void doBulk("reject")}>Bulk reject</button>
          </div>
        )}
        {isLoading ? (
          <div className="empty empty-sm">Loading queue…</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {canReview && <th />}
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Original</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    {canReview && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.includes(r.id)}
                          onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, r.id] : prev.filter((x) => x !== r.id))}
                        />
                      </td>
                    )}
                    <td>{r.employees?.full_name ?? r.employee_id.slice(0, 8)}</td>
                    <td>{r.work_date}</td>
                    <td>{r.exception_type_code}</td>
                    <td>{AEMS_STATUS_LABEL[r.status]}</td>
                    <td className="mono">{r.requested_clock_in?.slice(0, 5) ?? "—"} / {r.requested_clock_out?.slice(0, 5) ?? "—"}</td>
                    <td className="mono muted">{r.original_clock_in?.slice(0, 5) ?? "—"} / {r.original_clock_out?.slice(0, 5) ?? "—"}</td>
                    <td>
                      {canReview && ["Submitted", "Under Review", "Returned for Clarification"].includes(r.status) && (
                        <button type="button" className="btn btn-sm" onClick={() => setReviewRow(r)}>Review</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reviewRow && (
        <HrReviewModal
          row={reviewRow}
          onClose={() => setReviewRow(null)}
          onSaved={(m) => { fire(m); invalidate(); }}
        />
      )}

      {manualOpen && (
        <ModalShell
          title="Manual attendance"
          onClose={() => setManualOpen(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setManualOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={() => void doManual()}>Save</button>
            </>
          }
        >
          <label className="fld">
            <span className="l">Employee</span>
            <select className="input" value={manual.employee_id} onChange={(e) => setManual({ ...manual, employee_id: e.target.value })}>
              <option value="">Select…</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </label>
          <label className="fld"><span className="l">Date</span><input className="input" type="date" value={manual.work_date} onChange={(e) => setManual({ ...manual, work_date: e.target.value })} /></label>
          <div className="grid g2">
            <label className="fld"><span className="l">Clock in</span><input className="input" type="time" value={manual.clock_in} onChange={(e) => setManual({ ...manual, clock_in: e.target.value })} /></label>
            <label className="fld"><span className="l">Clock out</span><input className="input" type="time" value={manual.clock_out} onChange={(e) => setManual({ ...manual, clock_out: e.target.value })} /></label>
          </div>
          <label className="fld"><span className="l">Reason</span><input className="input" value={manual.reason} onChange={(e) => setManual({ ...manual, reason: e.target.value })} /></label>
          <label className="fld"><span className="l">Comments</span><textarea className="input" rows={2} value={manual.comment} onChange={(e) => setManual({ ...manual, comment: e.target.value })} /></label>
        </ModalShell>
      )}
    </div>
  );
}
