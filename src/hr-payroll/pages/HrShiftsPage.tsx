import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
import { useHrShifts, useShiftEmployeeCounts } from "../hooks/useHrShifts";
import { useEmployeeShiftHistory } from "../hooks/useEmployeeShiftHistory";
import { ShiftFormModal } from "../components/shifts/ShiftFormModal";
import { ShiftHistoryTable } from "../components/shifts/ShiftHistoryTable";
import { ShiftEmployeeMappingTable } from "../components/shifts/ShiftEmployeeMappingTable";
import type { ShiftRow } from "../lib/types";
import { hrAudit } from "../lib/hrApi";
import { weeklyOffDays } from "../lib/format";

type ShiftTab = "master" | "assignments";

export default function HrShiftsPage() {
  const { can, fire } = useHrAccess();
  const { data: shifts = [], isLoading } = useHrShifts();
  const { data: counts = {} } = useShiftEmployeeCounts();
  const { data: employees = [], isLoading: employeesLoading } = useHrEmployees({ activeOnly: false });
  const qc = useQueryClient();
  const [tab, setTab] = useState<ShiftTab>("master");
  const [edit, setEdit] = useState<ShiftRow | "new" | null>(null);
  const [shiftFilter, setShiftFilter] = useState("All");
  const [employeeFilter, setEmployeeFilter] = useState("All");
  const mng = can("manageEmp") || can("configure");

  const historyEmployeeId = employeeFilter !== "All" ? employeeFilter : undefined;
  const historyShiftId = shiftFilter !== "All" ? shiftFilter : undefined;
  const { data: history = [], isLoading: historyLoading } = useEmployeeShiftHistory({
    employeeId: historyEmployeeId,
    shiftId: historyShiftId,
  });

  const shiftsById = useMemo(
    () =>
      Object.fromEntries(
        shifts.map((s) => [
          s.id,
          { name: s.name, login_time: s.login_time, logout_time: s.logout_time },
        ]),
      ),
    [shifts],
  );

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
      <Link to="/hr/config" className="btn btn-sm" style={{ alignSelf: "flex-start" }}>
        ← Configuration hub
      </Link>
      <div className="card" style={{ background: "var(--wash)", borderColor: "var(--line)" }}>
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
          Shift Master — attendance timings live here only. Late Coming Policy stores deduction rules,
          not login/logout times. Assign shifts from Employee Master; changes are recorded in shift
          history.
        </div>
      </div>

      <div className="row-flex" style={{ gap: 8 }}>
        <button
          type="button"
          className={`btn btn-sm${tab === "master" ? " btn-primary" : ""}`}
          onClick={() => setTab("master")}
        >
          Shift definitions
        </button>
        <button
          type="button"
          className={`btn btn-sm${tab === "assignments" ? " btn-primary" : ""}`}
          onClick={() => setTab("assignments")}
        >
          Assignments & history
        </button>
      </div>

      {tab === "master" && (
        <>
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
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        setShiftFilter(s.id);
                        setTab("assignments");
                      }}
                    >
                      {counts[s.id] ?? 0} employees →
                    </button>
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
        </>
      )}

      {tab === "assignments" && (
        <>
          <div className="card-h" style={{ flexWrap: "wrap", gap: 12 }}>
            <label className="fld" style={{ minWidth: 200 }}>
              <span className="l">Shift</span>
              <select
                className="input"
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
              >
                <option value="All">All shifts</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="fld" style={{ minWidth: 240 }}>
              <span className="l">Employee</span>
              <select
                className="input"
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
              >
                <option value="All">All employees</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name} ({e.emp_code})
                  </option>
                ))}
              </select>
            </label>
            <Link to="/hr/employees" className="btn btn-sm" style={{ alignSelf: "flex-end" }}>
              Assign in Employee Master →
            </Link>
          </div>

          <div className="card">
            <div className="card-h">
              <h3>Current shift mapping</h3>
              <span className="tag">Live assignment from employee master</span>
            </div>
            <ShiftEmployeeMappingTable
              employees={employees}
              shiftsById={shiftsById}
              isLoading={employeesLoading || isLoading}
              shiftFilter={shiftFilter}
            />
          </div>

          <div className="card">
            <div className="card-h">
              <h3>Shift assignment history</h3>
              <span className="tag">Effective dates · reason on change</span>
            </div>
            <ShiftHistoryTable
              rows={history}
              isLoading={historyLoading}
              emptyLabel="No shift history for the selected filters."
            />
          </div>
        </>
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
