import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
import { useHrShifts } from "../hooks/useHrShifts";
import { useShiftEmployeeCounts } from "../hooks/useHrShifts";
import { ShiftFormModal } from "../components/shifts/ShiftFormModal";
import type { ShiftRow } from "../lib/types";
import { hrAudit } from "../lib/hrApi";
import { weeklyOffDays } from "../lib/format";

export default function HrShiftsPage() {
  const { can, fire } = useHrAccess();
  const { data: shifts = [], isLoading } = useHrShifts();
  const { data: counts = {} } = useShiftEmployeeCounts();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<ShiftRow | "new" | null>(null);
  const mng = can("manageEmp") || can("configure");

  const remove = async (s: ShiftRow) => {
    if ((counts[s.id] ?? 0) > 0) return;
    if (!confirm(`Delete shift ${s.name}?`)) return;
    const { error } = await supabase.from("shifts" as never).delete().eq("id", s.id);
    if (error) {
      fire(error.message);
      return;
    }
    await hrAudit("Shift Deleted", s.name, s.name, "—");
    fire("Shift deleted");
    await qc.invalidateQueries({ queryKey: ["hr-shifts"] });
  };

  const rows = useMemo(() => shifts, [shifts]);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card-h">
        <span className="tag">Day / Night / Rotational / Custom · drives late, break & OT</span>
        {mng && (
          <button type="button" className="btn btn-primary" onClick={() => setEdit("new")}>
            + Create Shift
          </button>
        )}
      </div>
      {isLoading ? (
        <div className="empty">Loading…</div>
      ) : (
        <div className="grid g3">
          {rows.map((s) => (
            <div className="card" key={s.id}>
              <div className="card-h" style={{ marginBottom: 8 }}>
                <h3 style={{ fontSize: 16 }}>{s.name}</h3>
                <span className="badge b-holiday">{s.type ?? "Day"}</span>
              </div>
              {(
                [
                  ["Working days/wk", `${s.working_days_per_week ?? 6} (${weeklyOffDays(s.working_days_per_week ?? 6)} off)`],
                  ["Login", s.login_time?.slice(0, 5)],
                  ["Logout", s.logout_time?.slice(0, 5)],
                  ["Working hrs", `${s.work_hours ?? 9}h`],
                  ["Grace", `${s.grace_min ?? 5} min`],
                  ["Break", `${s.break_min ?? 45} min`],
                  ["Half-day after", `${s.half_day_after_min ?? 60} min`],
                  ["Overtime", s.ot_eligible ? "Eligible" : "No"],
                ] as const
              ).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "5px 0",
                    fontSize: 12.5,
                    borderBottom: "1px solid #eef0f5",
                  }}
                >
                  <span className="muted">{k}</span>
                  <span className="mono">{v}</span>
                </div>
              ))}
              <div className="row-flex" style={{ marginTop: 10, justifyContent: "space-between" }}>
                <span className="tag">{counts[s.id] ?? 0} employees</span>
                {mng && (
                  <div className="row-flex">
                    <button type="button" className="btn btn-sm" onClick={() => setEdit(s)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-bad"
                      disabled={(counts[s.id] ?? 0) > 0}
                      onClick={() => void remove(s)}
                    >
                      Del
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {edit && (
        <ShiftFormModal
          shift={edit === "new" ? null : edit}
          onClose={() => setEdit(null)}
          onSaved={fire}
        />
      )}
    </div>
  );
}
