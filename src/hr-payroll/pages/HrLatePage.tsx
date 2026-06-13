import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrLateExemptions } from "../hooks/useHrRequests";
import { StatusBadge } from "../components/ui/StatusBadge";
import { hrAudit } from "../lib/hrApi";
import type { LateExemptionRow } from "../lib/types";

export default function HrLatePage() {
  const { can, fire } = useHrAccess();
  const qc = useQueryClient();
  const { data: late = [], isLoading } = useHrLateExemptions();

  const setStatus = async (row: LateExemptionRow, status: string) => {
    const { error } = await supabase
      .from("late_exemptions" as never)
      .update({ status } as never)
      .eq("id", row.id);
    if (error) {
      fire(error.message);
      return;
    }
    await hrAudit(`Late ${status}`, row.employees?.full_name ?? row.id, row.status, status);
    fire(`Late exemption ${status.toLowerCase()}`);
    await qc.invalidateQueries({ queryKey: ["hr-late"] });
    await qc.invalidateQueries({ queryKey: ["hr-pending-counts"] });
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ background: "#fff7ed", borderColor: "#fed7aa" }}>
        <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          <strong>Rule:</strong> report 10:00, grace to 10:05, &gt;1hr = Half Day. Approving an
          exemption removes one late, shifting the slab & recalculating salary. Watch Verification.
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        {isLoading ? (
          <div className="empty">Loading…</div>
        ) : late.length === 0 ? (
          <div className="empty">
            <div className="ico">◷</div>
            No requests.
          </div>
        ) : (
          <table style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Employee</th>
                <th>Date</th>
                <th>Official</th>
                <th>Actual</th>
                <th>Delay</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {late.map((l) => (
                <tr key={l.id}>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {l.id.slice(0, 8)}
                  </td>
                  <td className="strong">{l.employees?.full_name}</td>
                  <td>{l.late_date}</td>
                  <td className="mono">{l.official_in?.slice(0, 5)}</td>
                  <td className="mono">{l.actual_in?.slice(0, 5)}</td>
                  <td style={{ color: "var(--clay)", fontWeight: 600 }}>
                    {l.delay_min}m
                    {l.delay_min > 60 && (
                      <div style={{ fontSize: 10, color: "var(--rose)" }}>→ Half Day</div>
                    )}
                  </td>
                  <td style={{ fontSize: 12 }}>{l.reason}</td>
                  <td>
                    <StatusBadge status={l.status} />
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
                              onClick={() => void setStatus(l, "Rejected")}
                            >
                              Reject
                            </button>
                          </>
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
                    </div>
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
