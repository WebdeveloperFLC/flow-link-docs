import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
import { useHrShifts } from "../hooks/useHrShifts";
import { useHrLeaveRequests, useHrLeaveBalances, useHrApprovals } from "../hooks/useHrRequests";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ModalShell } from "../components/ui/ModalShell";
import { HR_ORG_ID } from "../lib/constants";
import {
  displayLeaveBalances,
  HALF_DAY_PARTS,
  isLegacyLeaveType,
  isSickCertificateRequired,
  leaveBalanceRemaining,
  leaveDaysForDuration,
  leaveDurationLabel,
  leaveTypeOptionHint,
  LEAVE_DURATION_FULL,
  LEAVE_DURATION_HALF,
  LEAVE_ENTITLED,
  MONTHLY_PAID_LEAVE_CAP,
  monthlyPaidLeaveRemaining,
  monthlyPaidLeaveUsed,
  PAID_APPLY_LEAVE_TYPES,
  resolveLeaveApplication,
  UNPAID_LEAVE_TYPE,
} from "../lib/leavePolicy";
import { hrAudit, processApprovalDecision, rebuildPayrollLine } from "../lib/hrApi";
import { uploadHrDocument, getHrDocumentSignedUrl } from "../lib/hrStorage";
import { ApprovalTrail } from "../components/ui/ApprovalTrail";
import type { LeaveRequestRow } from "../lib/types";

const LEAVE_DOC_TYPE = "Leave Supporting Document";
const ACCEPTED_LEAVE_DOCS = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx";

function LeaveModal({
  onClose,
  onSaved,
  allLeaves,
}: {
  onClose: () => void;
  onSaved: (msg: string) => void;
  allLeaves: LeaveRequestRow[];
}) {
  const { user } = useAuth();
  const { actualCan } = useHrAccess();
  const { data: employees = [] } = useHrEmployees();
  const { data: shifts = [] } = useHrShifts();
  const selfEmp = useMemo(
    () => employees.find((e) => e.staff_id === user?.id),
    [employees, user?.id],
  );
  const selfOnly = !actualCan("manageEmp");

  const [f, setF] = useState({
    employee_id: selfEmp?.id ?? employees[0]?.id ?? "",
    type: PAID_APPLY_LEAVE_TYPES[0],
    duration_type: LEAVE_DURATION_FULL,
    half_day_part: "",
    from_date: "",
    to_date: "",
    days: 1,
    reason: "",
  });
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const { data: balances = [] } = useHrLeaveBalances(f.employee_id || undefined);
  const [err, setErr] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selfOnly && selfEmp?.id) {
      setF((prev) => ({ ...prev, employee_id: selfEmp.id }));
    }
  }, [selfOnly, selfEmp?.id]);

  const selectedEmp = useMemo(
    () => employees.find((e) => e.id === f.employee_id),
    [employees, f.employee_id],
  );
  const selectedShift = shifts.find((s) => s.id === selectedEmp?.shift_id);
  const shiftLogin = selectedShift?.login_time ?? null;
  const shiftTimezone = selectedShift?.timezone ?? "Asia/Kolkata";

  const employeeLeaves = useMemo(
    () => allLeaves.filter((l) => l.employee_id === f.employee_id),
    [allLeaves, f.employee_id],
  );

  const effectiveDays = useMemo(
    () => leaveDaysForDuration(f.duration_type, f.from_date, f.to_date || f.from_date),
    [f.duration_type, f.from_date, f.to_date],
  );

  useEffect(() => {
    if (f.duration_type === LEAVE_DURATION_HALF) {
      setF((prev) => {
        if (prev.days === 0.5 && prev.to_date === prev.from_date) return prev;
        return { ...prev, days: 0.5, to_date: prev.from_date };
      });
      return;
    }
    if (f.from_date && f.to_date) {
      const computed = leaveDaysForDuration(LEAVE_DURATION_FULL, f.from_date, f.to_date);
      setF((prev) => (prev.days === computed ? prev : { ...prev, days: computed }));
    }
  }, [f.duration_type, f.from_date, f.to_date]);

  const certRequired = useMemo(
    () =>
      f.type === "Sick Leave" &&
      f.from_date &&
      isSickCertificateRequired(employeeLeaves, f.employee_id, f.from_date, effectiveDays),
    [f.type, f.from_date, f.employee_id, effectiveDays, employeeLeaves],
  );

  const hasDocument = !!documentFile;

  const shownBalances = useMemo(
    () => displayLeaveBalances(balances, selectedEmp?.work_week, selectedShift?.type),
    [balances, selectedEmp?.work_week, selectedShift?.type],
  );

  const resolution = useMemo(
    () =>
      resolveLeaveApplication({
        preferredType: f.type,
        days: effectiveDays,
        employeeId: f.employee_id,
        fromDate: f.from_date,
        balances,
        requests: employeeLeaves,
        employee: selectedEmp,
        hasDocument,
        shiftLoginTime: shiftLogin,
        shiftTimezone,
      }),
    [
      f.type,
      effectiveDays,
      f.employee_id,
      f.from_date,
      hasDocument,
      balances,
      employeeLeaves,
      selectedEmp,
      shiftLogin,
      shiftTimezone,
    ],
  );

  const paidTypeSelected = PAID_APPLY_LEAVE_TYPES.includes(f.type as (typeof PAID_APPLY_LEAVE_TYPES)[number]);
  const showUnpaidWarning =
    paidTypeSelected && resolution.forcedUnpaid && f.from_date && resolution.unpaidReason;

  const monthUsed = monthlyPaidLeaveUsed(employeeLeaves, f.employee_id, f.from_date);
  const monthLeft = monthlyPaidLeaveRemaining(employeeLeaves, f.employee_id, f.from_date);

  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.from_date) e.from_date = "Required";
    if (!f.reason.trim()) e.reason = "Reason required";
    if (f.duration_type === LEAVE_DURATION_HALF) {
      if (!f.half_day_part) e.half_day_part = "Select First or Second Half";
    } else {
      if (!f.to_date) e.to_date = "Required";
      if (!effectiveDays || effectiveDays <= 0) e.days = "> 0";
    }
    if (certRequired && !documentFile) {
      e.document = "Medical certificate required when Sick Leave exceeds 1 day in a month";
    }
    setErr(e);
    if (Object.keys(e).length) return;

    setSubmitting(true);
    try {
      const submitResolution = resolveLeaveApplication({
        preferredType: f.type,
        days: effectiveDays,
        employeeId: f.employee_id,
        fromDate: f.from_date,
        balances,
        requests: employeeLeaves,
        employee: selectedEmp,
        hasDocument,
        shiftLoginTime: shiftLogin,
        shiftTimezone,
      });
      const finalType =
        f.type === UNPAID_LEAVE_TYPE || submitResolution.forcedUnpaid
          ? UNPAID_LEAVE_TYPE
          : f.type;
      const toDate =
        f.duration_type === LEAVE_DURATION_HALF ? f.from_date : f.to_date || f.from_date;

      let documentId: string | null = null;
      if (documentFile) {
        const uploaded = await uploadHrDocument(f.employee_id, documentFile, LEAVE_DOC_TYPE);
        documentId = uploaded.id;
      }

      const { error } = await supabase.from("leave_requests" as never).insert({
        org_id: HR_ORG_ID,
        employee_id: f.employee_id,
        type: finalType,
        duration_type: f.duration_type,
        half_day_part: f.duration_type === LEAVE_DURATION_HALF ? f.half_day_part : null,
        from_date: f.from_date,
        to_date: toDate,
        days: effectiveDays,
        reason: f.reason.trim(),
        has_document: !!documentFile,
        document_id: documentId,
        status: "Pending",
      } as never);
      if (error) {
        onSaved(error.message);
        return;
      }
      const note =
        finalType === UNPAID_LEAVE_TYPE && f.type !== UNPAID_LEAVE_TYPE
          ? `Leave submitted as Unpaid (${submitResolution.unpaidReason ?? "balance or rules"})`
          : "Leave submitted";
      await hrAudit("Leave Applied", finalType, "—", f.from_date);
      onSaved(note);
      onClose();
    } catch (uploadErr) {
      onSaved(uploadErr instanceof Error ? uploadErr.message : "Document upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      title="Apply for Leave"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={submitting} onClick={() => void save()}>
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </>
      }
    >
      {!selfOnly ? (
        <label className="fld">
          <span className="l">Employee</span>
          <select
            className="input"
            value={f.employee_id}
            onChange={(e) => setF({ ...f, employee_id: e.target.value })}
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="fld">
          <span className="l">Employee</span>
          <div className="input" style={{ background: "var(--paper)" }}>
            {selfEmp?.full_name ?? "—"}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 12, marginBottom: 12, background: "var(--paper)" }}>
        <div style={{ fontSize: 11, color: "var(--mut)", fontWeight: 600, marginBottom: 6 }}>
          Leave balance (remaining / entitled)
        </div>
        <div className="row-flex">
          {shownBalances.map((b) => (
            <span key={b.type} className="tag">
              {b.type}: {leaveBalanceRemaining(b).toFixed(1)} / {b.entitled}
            </span>
          ))}
        </div>
        {shownBalances.every((b) => leaveBalanceRemaining(b) <= 0) && (
          <div style={{ fontSize: 11.5, color: "var(--rose)", marginTop: 8 }}>
            No accrued balance yet — HR can run monthly accrual from Config. You may still apply; insufficient
            balance submits as Unpaid Leave.
          </div>
        )}
        {f.from_date && (
          <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 8 }}>
            This month: {monthUsed.toFixed(1)} / {MONTHLY_PAID_LEAVE_CAP} paid days used
            {monthLeft > 0 ? ` · ${monthLeft.toFixed(1)} left` : " · cap reached"}
            {" · "}
            Annual: {LEAVE_ENTITLED.casual}+{LEAVE_ENTITLED.sick} (6-day) — no carry-forward
          </div>
        )}
      </div>

      {resolution.ruleViolation && (
        <div
          className="card"
          style={{
            padding: 10,
            marginBottom: 12,
            background: "#fff0f0",
            border: "1px solid #f0c0c0",
            fontSize: 12.5,
            color: "var(--rose)",
          }}
        >
          <strong>Warning:</strong> {resolution.ruleViolation}
        </div>
      )}

      {showUnpaidWarning && (
        <div
          className="card"
          style={{
            padding: 10,
            marginBottom: 12,
            background: "#fff8ed",
            border: "1px solid #f0d9a8",
            fontSize: 12.5,
          }}
        >
          <strong>Paid leave not available.</strong> {resolution.unpaidReason} Leave will submit as{" "}
          <strong>Unpaid Leave</strong> unless balance and rules are met.
        </div>
      )}

      <label className="fld">
        <span className="l">Leave Type</span>
        <select
          className="input"
          value={f.type}
          onChange={(e) => setF({ ...f, type: e.target.value })}
        >
          {PAID_APPLY_LEAVE_TYPES.map((o) => (
            <option key={o} value={o}>
              {o}
              {leaveTypeOptionHint(o, resolution.selectablePaidTypes, balances)}
            </option>
          ))}
          <option value={UNPAID_LEAVE_TYPE}>{UNPAID_LEAVE_TYPE}</option>
        </select>
      </label>

      <div className="fld">
        <span className="l">Leave Duration</span>
        <div className="row-flex" style={{ gap: 20, marginTop: 4 }}>
          {[LEAVE_DURATION_FULL, LEAVE_DURATION_HALF].map((opt) => (
            <label key={opt} className="row-flex" style={{ fontSize: 13, cursor: "pointer" }}>
              <input
                type="radio"
                name="leave_duration"
                checked={f.duration_type === opt}
                onChange={() =>
                  setF({
                    ...f,
                    duration_type: opt,
                    half_day_part: opt === LEAVE_DURATION_HALF ? f.half_day_part : "",
                  })
                }
              />
              {opt}
            </label>
          ))}
        </div>
      </div>

      {f.duration_type === LEAVE_DURATION_HALF && (
        <div className="fld">
          <span className="l">Half Day Session</span>
          <div className="row-flex" style={{ gap: 20, marginTop: 4 }}>
            {HALF_DAY_PARTS.map((part) => (
              <label key={part} className="row-flex" style={{ fontSize: 13, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="half_day_part"
                  checked={f.half_day_part === part}
                  onChange={() => setF({ ...f, half_day_part: part })}
                />
                {part}
              </label>
            ))}
          </div>
          {err.half_day_part && (
            <span style={{ fontSize: 11.5, color: "var(--rose)", marginTop: 4 }}>{err.half_day_part}</span>
          )}
        </div>
      )}

      <div className="grid g3" style={{ gap: "0 14px" }}>
        <label className="fld">
          <span className="l">From</span>
          <input
            className={`input${err.from_date ? " err" : ""}`}
            type="date"
            value={f.from_date}
            onChange={(e) => {
              const from_date = e.target.value;
              setF((prev) => ({
                ...prev,
                from_date,
                to_date:
                  prev.duration_type === LEAVE_DURATION_HALF
                    ? from_date
                    : prev.to_date && prev.to_date < from_date
                      ? from_date
                      : prev.to_date,
              }));
            }}
          />
        </label>
        {f.duration_type === LEAVE_DURATION_FULL ? (
          <>
            <label className="fld">
              <span className="l">To</span>
              <input
                className={`input${err.to_date ? " err" : ""}`}
                type="date"
                min={f.from_date || undefined}
                value={f.to_date}
                onChange={(e) => setF({ ...f, to_date: e.target.value })}
              />
            </label>
            <label className="fld">
              <span className="l">Days</span>
              <input
                className={`input mono${err.days ? " err" : ""}`}
                type="number"
                readOnly
                value={effectiveDays}
                title="Calculated from date range"
              />
            </label>
          </>
        ) : (
          <label className="fld">
            <span className="l">Days</span>
            <input className="input mono" type="text" readOnly value="0.5" />
          </label>
        )}
      </div>
      <label className="fld">
        <span className="l">Reason</span>
        <textarea
          className={`input${err.reason ? " err" : ""}`}
          rows={2}
          value={f.reason}
          onChange={(e) => setF({ ...f, reason: e.target.value })}
        />
      </label>
      <label className="fld">
        <span className="l">
          Supporting document
          {certRequired ? " (required for this sick leave)" : " (optional)"}
        </span>
        <input
          ref={fileRef}
          className={`input${err.document ? " err" : ""}`}
          type="file"
          accept={ACCEPTED_LEAVE_DOCS}
          onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
        />
        {documentFile && (
          <span className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
            Selected: {documentFile.name}
          </span>
        )}
        {err.document && (
          <span style={{ fontSize: 11.5, color: "var(--rose)", marginTop: 4 }}>{err.document}</span>
        )}
        {!certRequired && (
          <span className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
            Upload medical certificate or proof when applicable (PDF, image, or Word).
          </span>
        )}
      </label>
    </ModalShell>
  );
}

export default function HrLeavePage() {
  const { can, fire, cycle } = useHrAccess();
  const qc = useQueryClient();
  const { data: leaves = [], isLoading } = useHrLeaveRequests();
  const leaveIds = leaves.map((l) => l.id);
  const { data: approvals = [] } = useHrApprovals("leave", leaveIds);
  const [open, setOpen] = useState(false);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [rejectRow, setRejectRow] = useState<LeaveRequestRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [showLegacy, setShowLegacy] = useState(false);

  const filteredLeaves = leaves.filter((l) => {
    if (filterFrom && l.from_date < filterFrom) return false;
    if (filterTo && l.from_date > filterTo) return false;
    if (!showLegacy && isLegacyLeaveType(l.type)) return false;
    return true;
  });

  const setStatus = async (row: LeaveRequestRow, status: string, rejectionReason?: string) => {
    try {
      const result = (await processApprovalDecision(
        "leave",
        row.id,
        status,
        rejectionReason,
      )) as {
        status?: string;
      } | null;
      if (status === "Rejected" && rejectionReason) {
        await supabase
          .from("leave_requests" as never)
          .update({ rejection_reason: rejectionReason } as never)
          .eq("id", row.id);
      }
      if (result?.status === "Approved" && cycle?.id) {
        await rebuildPayrollLine(row.employee_id, cycle.id);
      }
      await hrAudit(`Leave ${status}`, row.employees?.full_name ?? row.id, row.status, status);
      fire(result?.status === "Pending" ? "Stage approved — awaiting next approver" : `Leave ${status.toLowerCase()}`);
      await qc.invalidateQueries({ queryKey: ["hr-leaves"] });
      await qc.invalidateQueries({ queryKey: ["hr-leave-balances"] });
      await qc.invalidateQueries({ queryKey: ["hr-pending-counts"] });
      await qc.invalidateQueries({ queryKey: ["hr-approvals"] });
      await qc.invalidateQueries({ queryKey: ["hr-payroll-lines"] });
    } catch (e) {
      fire(e instanceof Error ? e.message : "Update failed");
    }
  };

  const cancelLeave = async (row: LeaveRequestRow) => {
    if (!confirm("Cancel this leave request?")) return;
    const { error } = await supabase
      .from("leave_requests" as never)
      .update({ status: "Cancelled", cancelled_at: new Date().toISOString() } as never)
      .eq("id", row.id);
    if (error) {
      fire(error.message);
      return;
    }
    fire("Leave cancelled");
    await qc.invalidateQueries({ queryKey: ["hr-leaves"] });
  };

  const remove = async (row: LeaveRequestRow) => {
    if (!confirm("Delete this leave request?")) return;
    const { error } = await supabase.from("leave_requests" as never).delete().eq("id", row.id);
    if (error) {
      fire(error.message);
      return;
    }
    fire("Leave deleted");
    await qc.invalidateQueries({ queryKey: ["hr-leaves"] });
  };

  const openLeaveDoc = async (row: LeaveRequestRow) => {
    const path = row.employee_documents?.storage_path;
    if (!path) {
      fire(row.has_document ? "Document file not linked — re-upload if needed" : "No document attached");
      return;
    }
    try {
      const url = await getHrDocumentSignedUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      fire(e instanceof Error ? e.message : "Could not open document");
    }
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card-h">
        <span className="tag">
          12 Casual + 6 Sick/yr · {MONTHLY_PAID_LEAVE_CAP}/mo cap · 7d / 1mo notice
        </span>
        <div className="row-flex">
          <label className="row-flex" style={{ fontSize: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={showLegacy} onChange={(e) => setShowLegacy(e.target.checked)} />
            Show legacy
          </label>
          <input
            className="input"
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            title="From date"
          />
          <input
            className="input"
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            title="To date"
          />
          {can("apply") && (
            <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
              + Apply Leave
            </button>
          )}
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        {isLoading ? (
          <div className="empty">Loading…</div>
        ) : filteredLeaves.length === 0 ? (
          <div className="empty">
            <div className="ico">⊟</div>
            No leave requests.
          </div>
        ) : (
          <table style={{ minWidth: 800 }}>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Employee</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Doc</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.map((l) => (
                <tr key={l.id}>
                  <td className="mono strong" style={{ fontSize: 12 }}>
                    {l.id.slice(0, 8)}
                  </td>
                  <td>
                    {l.employees?.full_name}
                    <div className="muted" style={{ fontSize: 11.5 }}>
                      {l.reason}
                      {l.rejection_reason && (
                        <span style={{ color: "var(--rose)" }}> · Rejected: {l.rejection_reason}</span>
                      )}
                      {l.cancelled_at && (
                        <span style={{ color: "var(--mut)" }}> · Cancelled</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div>{l.type}</div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      {leaveDurationLabel(l.days, l.duration_type, l.half_day_part)}
                      {isLegacyLeaveType(l.type) && " · Legacy"}
                    </div>
                  </td>
                  <td>
                    {l.from_date}
                    {l.from_date !== l.to_date ? ` – ${l.to_date}` : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>{l.days}</td>
                  <td>
                    {l.has_document ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        title={l.employee_documents?.file_name ?? "View document"}
                        onClick={() => void openLeaveDoc(l)}
                      >
                        📎
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={l.status} />
                    <ApprovalTrail entityId={l.id} approvals={approvals} />
                  </td>
                  <td>
                    <div className="row-flex">
                      {can("approve") ? (
                        l.status === "Pending" ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-good"
                              onClick={() => void setStatus(l, "Approved")}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-bad"
                              onClick={() => {
                                setRejectRow(l);
                                setRejectReason("");
                              }}
                            >
                              Reject
                            </button>
                          </>
                        ) : l.status === "Pending" && can("apply") ? (
                          <button type="button" className="btn btn-sm" onClick={() => void cancelLeave(l)}>
                            Cancel
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => void setStatus(l, "Pending")}
                          >
                            Reopen
                          </button>
                        )
                      ) : (
                        <span className="muted" style={{ fontSize: 11.5 }}>
                          view only
                        </span>
                      )}
                      {can("approve") && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost btn-bad"
                          onClick={() => void remove(l)}
                        >
                          ✕
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
      {rejectRow && (
        <ModalShell
          title="Reject leave request"
          onClose={() => setRejectRow(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setRejectRow(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-bad"
                disabled={!rejectReason.trim()}
                onClick={() => {
                  void setStatus(rejectRow, "Rejected", rejectReason.trim()).then(() =>
                    setRejectRow(null),
                  );
                }}
              >
                Reject
              </button>
            </>
          }
        >
          <label className="fld">
            <span className="l">Rejection reason (required)</span>
            <textarea
              className="input"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason shown to employee"
            />
          </label>
        </ModalShell>
      )}
      {open && (
        <LeaveModal
          allLeaves={leaves}
          onClose={() => setOpen(false)}
          onSaved={(m) => {
            fire(m);
            void qc.invalidateQueries({ queryKey: ["hr-leaves"] });
            void qc.invalidateQueries({ queryKey: ["hr-leave-balances"] });
            void qc.invalidateQueries({ queryKey: ["hr-pending-counts"] });
          }}
        />
      )}
    </div>
  );
}
