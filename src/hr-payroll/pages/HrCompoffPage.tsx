import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
import { useHrCompoffRequests } from "../hooks/useHrRequests";
import { Stat } from "../components/ui/Stat";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ModalShell } from "../components/ui/ModalShell";
import { HR_ORG_ID } from "../lib/constants";
import { hrAudit } from "../lib/hrApi";
import type { CompoffRequestRow } from "../lib/types";

function CompoffModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const { data: employees = [] } = useHrEmployees();
  const [f, setF] = useState({
    employee_id: employees[0]?.id ?? "",
    worked_date: "",
    occasion: "Worked on Weekly Off",
    reason: "",
  });
  const [err, setErr] = useState<Record<string, string>>({});

  const save = async () => {
    if (!f.worked_date) {
      setErr({ worked_date: "Required" });
      return;
    }
    const { error } = await supabase.from("compoff_requests" as never).insert({
      org_id: HR_ORG_ID,
      employee_id: f.employee_id,
      worked_date: f.worked_date,
      occasion: f.occasion,
      reason: f.reason || null,
      status: "Pending",
    } as never);
    if (error) {
      onSaved(error.message);
      return;
    }
    await hrAudit("Comp-off Requested", f.occasion);
    onSaved("Comp-off submitted");
    onClose();
  };

  return (
    <ModalShell
      title="Request Comp-Off"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void save()}>
            Submit
          </button>
        </>
      }
    >
      <label className="fld">
        <span className="l">Employee</span>
        <select
          className="input"
          value={f.employee_id}
          onChange={(e) => setF({ ...f, employee_id: e.target.value })}
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name}
            </option>
          ))}
        </select>
      </label>
      <label className="fld">
        <span className="l">Date Worked</span>
        <input
          className={`input${err.worked_date ? " err" : ""}`}
          type="date"
          value={f.worked_date}
          onChange={(e) => setF({ ...f, worked_date: e.target.value })}
        />
      </label>
      <label className="fld">
        <span className="l">Occasion</span>
        <select className="input" value={f.occasion} onChange={(e) => setF({ ...f, occasion: e.target.value })}>
          {[
            "Worked on Sunday",
            "Worked on Weekly Off",
            "Worked on Public Holiday",
            "Worked on Festival Holiday",
            "Worked on Approved Leave Day",
          ].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </label>
      <label className="fld">
        <span className="l">Remarks</span>
        <textarea
          className="input"
          rows={2}
          value={f.reason}
          onChange={(e) => setF({ ...f, reason: e.target.value })}
        />
      </label>
    </ModalShell>
  );
}

export default function HrCompoffPage() {
  const { can, fire } = useHrAccess();
  const qc = useQueryClient();
  const { data: compoff = [], isLoading } = useHrCompoffRequests();
  const [open, setOpen] = useState(false);

  const setStatus = async (row: CompoffRequestRow, status: string) => {
    const { error } = await supabase
      .from("compoff_requests" as never)
      .update({ status } as never)
      .eq("id", row.id);
    if (error) {
      fire(error.message);
      return;
    }
    await hrAudit(`Comp-off ${status}`, row.employees?.full_name ?? row.id, row.status, status);
    fire(`Comp-off ${status.toLowerCase()}`);
    await qc.invalidateQueries({ queryKey: ["hr-compoff"] });
    await qc.invalidateQueries({ queryKey: ["hr-pending-counts"] });
  };

  const remove = async (row: CompoffRequestRow) => {
    const { error } = await supabase.from("compoff_requests" as never).delete().eq("id", row.id);
    if (error) {
      fire(error.message);
      return;
    }
    fire("Request deleted");
    await qc.invalidateQueries({ queryKey: ["hr-compoff"] });
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card-h">
        <span className="tag">Flow: Employee → Manager → HR · approved adds to payable</span>
        {can("apply") && (
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            + Request Comp-Off
          </button>
        )}
      </div>
      <div className="grid g3">
        <Stat
          lab="Approved"
          val={compoff.filter((c) => c.status === "Approved").length}
          meta="in payroll"
          color="var(--moss)"
        />
        <Stat
          lab="Pending"
          val={compoff.filter((c) => c.status === "Pending").length}
          meta="awaiting"
          color="var(--clay)"
        />
        <Stat lab="Total" val={compoff.length} meta="requests" color="var(--sky)" />
      </div>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        {isLoading ? (
          <div className="empty">Loading…</div>
        ) : compoff.length === 0 ? (
          <div className="empty">
            <div className="ico">⇄</div>
            No comp-off requests.
          </div>
        ) : (
          <table style={{ minWidth: 680 }}>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Employee</th>
                <th>Date Worked</th>
                <th>Occasion</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {compoff.map((c) => (
                <tr key={c.id}>
                  <td className="mono strong" style={{ fontSize: 12 }}>
                    {c.id.slice(0, 8)}
                  </td>
                  <td>{c.employees?.full_name}</td>
                  <td>{c.worked_date}</td>
                  <td style={{ fontSize: 12.5 }}>
                    {c.occasion}
                    <div className="muted" style={{ fontSize: 11 }}>
                      {c.reason}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>
                    <div className="row-flex">
                      {can("approve") ? (
                        c.status === "Pending" ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-good"
                              onClick={() => void setStatus(c, "Approved")}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-bad"
                              onClick={() => void setStatus(c, "Rejected")}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => void setStatus(c, "Pending")}
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
                          onClick={() => void remove(c)}
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
      {open && (
        <CompoffModal
          onClose={() => setOpen(false)}
          onSaved={(m) => {
            fire(m);
            void qc.invalidateQueries({ queryKey: ["hr-compoff"] });
            void qc.invalidateQueries({ queryKey: ["hr-pending-counts"] });
          }}
        />
      )}
    </div>
  );
}
