import { useEffect, useState } from "react";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
import { useHrPayrollLine } from "../hooks/useHrPayroll";
import { useHrDocuments } from "../hooks/useHrRequests";
import { useHrShifts } from "../hooks/useHrShifts";
import { useHrAttendance } from "../hooks/useHrAttendance";
import { useAttendanceActions } from "../hooks/useAttendanceActions";
import { EmployeeSeg } from "../components/ui/EmployeeSeg";
import { Stat } from "../components/ui/Stat";
import { PunchStation } from "../components/attendance/PunchStation";
import { formatWorkDate, todayIso } from "../lib/attendanceMetrics";
import { inr, initials } from "../lib/format";

export default function HrEssPage() {
  const { can, cycle, fire } = useHrAccess();
  const { data: employees = [] } = useHrEmployees();
  const { data: shifts = [] } = useHrShifts();
  const [empId, setEmpId] = useState("");
  const emp = employees.find((e) => e.id === empId) ?? employees[0];
  const shift = shifts.find((s) => s.id === emp?.shift_id) ?? shifts[0];

  useEffect(() => {
    if (!empId && employees[0]) setEmpId(employees[0].id);
  }, [empId, employees]);

  const { data: att = [] } = useHrAttendance(emp?.id, cycle?.start_date, cycle?.end_date);
  const { data: line } = useHrPayrollLine(emp?.id, cycle?.id);
  const { data: docs = [] } = useHrDocuments(emp?.id);
  const actions = useAttendanceActions(cycle?.id, fire);

  const today = todayIso();
  const todayRow = att.find((a) => a.work_date === today) ?? null;

  if (!emp || !shift) return <div className="empty">No employee profile linked.</div>;

  const r = line ?? {
    daily_rate: emp.monthly_gross / (cycle?.payroll_days ?? 30),
    payable_days: 0,
    gross_earned: 0,
    incentive: emp.incentive,
    bonus: emp.bonus,
    pf_employee: 0,
    esic_employee: 0,
    net_salary: 0,
    late_count: 0,
    late_deduction: 0,
    comp_off: 0,
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card-h">
        <EmployeeSeg employees={employees} selectedId={emp.id} onSelect={setEmpId} />
        <span className="tag">own portal</span>
      </div>

      <div className="card" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div className="avatar" style={{ width: 56, height: 56, fontSize: 19 }}>
          {initials(emp.full_name)}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="serif" style={{ fontSize: 21, fontWeight: 600 }}>
            {emp.full_name}
          </div>
          <div style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>
            {emp.designation} · {emp.department} · {emp.branches?.name ?? "—"}
          </div>
          <div className="row-flex" style={{ marginTop: 6 }}>
            <span className="tag">{emp.emp_code}</span>
            <span className="tag">{emp.employment_type}</span>
          </div>
        </div>
      </div>

      {can("apply") && (
        <PunchStation
          employee={emp}
          shift={shift}
          todayRow={todayRow}
          todayDate={formatWorkDate(today)}
          canPunch
          onPunch={(field) => {
            if (!todayRow) return;
            void actions.punch(todayRow, field, emp.full_name, todayRow.work_date);
          }}
          onStartDay={() => void actions.startAndCheckIn(emp.id, emp.full_name)}
        />
      )}

      <div className="grid g4">
        <Stat lab="Earned Today" val={inr(r.daily_rate)} meta="daily rate" color="var(--moss)" />
        <Stat
          lab="Net This Cycle"
          val={inr(line?.net_salary ?? 0)}
          meta={`${line?.payable_days ?? 0} payable days`}
          color="var(--gold)"
        />
        <Stat
          lab="Late Comings"
          val={line?.late_count ?? 0}
          meta={`${line?.late_deduction ?? 0}d deduction`}
          color="var(--clay)"
        />
        <Stat lab="Comp-Off" val={line?.comp_off ?? 0} meta="approved" color="var(--sky)" />
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="card-h">
            <h3>Salary breakdown</h3>
          </div>
          {(
            [
              ["Monthly Gross", inr(emp.monthly_gross)],
              ["Basic", inr(emp.basic)],
              ["HRA", inr(emp.hra)],
              ["Daily Rate", inr(line?.daily_rate ?? 0)],
              ["Payable Days", line?.payable_days ?? 0],
              ["Earned Gross", inr(line?.gross_earned ?? 0)],
              ["Incentive", inr(line?.incentive ?? 0)],
              ["Bonus", inr(line?.bonus ?? 0)],
              ["PF (−)", inr(line?.pf_employee ?? 0)],
              ["ESIC (−)", inr(line?.esic_employee ?? 0)],
              ["Net Payable", inr(line?.net_salary ?? 0)],
            ] as const
          ).map(([k, v], i, a) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "7px 0",
                borderBottom: i < a.length - 1 ? "1px solid #eef0f5" : "none",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{k}</span>
              <span
                className="mono"
                style={{
                  fontWeight: i === a.length - 1 ? 700 : 400,
                  color: i === a.length - 1 ? "var(--moss)" : "inherit",
                }}
              >
                {v}
              </span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-h">
            <h3>My documents & statutory</h3>
          </div>
          <div className="grid g3" style={{ gap: 8, marginBottom: 12 }}>
            {(
              [
                ["PF", emp.pf_number?.split("/").pop() ?? "—"],
                ["UAN", emp.uan ?? "—"],
                ["ESIC", emp.esic_number ?? "—"],
              ] as const
            ).map(([a, b]) => (
              <div
                key={a}
                style={{ textAlign: "center", padding: 8, background: "var(--paper)", borderRadius: 8 }}
              >
                <div style={{ fontSize: 10, color: "var(--mut)", fontWeight: 600 }}>{a}</div>
                <div className="mono" style={{ fontSize: 11, marginTop: 3 }}>
                  {b}
                </div>
              </div>
            ))}
          </div>
          {docs.length === 0 ? (
            <div className="empty" style={{ padding: 16 }}>
              No documents.
            </div>
          ) : (
            <div className="grid" style={{ gap: 7 }}>
              {docs.map((d: { id: string; doc_type: string; mime: string | null }) => (
                <div className="doc-chip" key={d.id}>
                  <span className="ext">{d.mime?.includes("pdf") ? "PDF" : "DOC"}</span>
                  <span style={{ flex: 1 }}>{d.doc_type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
