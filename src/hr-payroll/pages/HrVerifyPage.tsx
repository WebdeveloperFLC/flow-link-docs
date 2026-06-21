import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrPayrollLines, rpcRollupInputs } from "../hooks/useHrPayroll";
import { ModalShell } from "../components/ui/ModalShell";
import { StatusBadge } from "../components/ui/StatusBadge";
import { inr, formatMoney, employeeCurrency } from "../lib/format";
import { rebuildPayrollLine, hrAudit, lockPayrollCycle, reopenPayrollCycle, fetchPayrollRegisterExport, processPayrollCycle, approvePayrollCycle, markPayrollPaid, rebuildPayrollCycle } from "../lib/hrApi";
import { printSalarySlip } from "../lib/salarySlip";
import { downloadPayrollRegister, linesToRegisterRows, printRegisterPdf, printBatchSalarySlips } from "../lib/payrollExport";
import type { PayrollLineRow } from "../lib/types";

type OverrideFields = {
  late: number;
  mispunch: number;
  leaves: number;
  paid_leaves: number;
  comp_off: number;
  ul: number;
  sandwich: number;
  unpaid_training: number;
};

function OverrideModal({
  line,
  cycleId,
  onClose,
  onSaved,
}: {
  line: PayrollLineRow;
  cycleId: string;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const qc = useQueryClient();
  const [auto, setAuto] = useState<OverrideFields | null>(null);
  const [f, setF] = useState<OverrideFields>({
    late: line.late_count,
    mispunch: line.mispunch_count,
    leaves: line.leaves_taken,
    paid_leaves: line.paid_leaves,
    comp_off: line.comp_off,
    ul: line.ul_count,
    sandwich: line.sandwich_count,
    unpaid_training: line.unpaid_training,
  });
  useEffect(() => {
    void rpcRollupInputs(line.employee_id, cycleId).then((d) => {
      setAuto({
        late: Number(d.late ?? 0),
        mispunch: Number(d.mispunch ?? 0),
        leaves: Number(d.leaves ?? 0),
        paid_leaves: Number(d.paid_leaves ?? 0),
        comp_off: Number(d.comp_off ?? 0),
        ul: Number(d.ul ?? 0),
        sandwich: Number(d.sandwich ?? 0),
        unpaid_training: Number(d.unpaid_training ?? 0),
      });
    });
  }, [line.employee_id, cycleId]);

  const setNum = (k: keyof OverrideFields, v: string) => {
    setF((prev) => ({ ...prev, [k]: v === "" ? 0 : parseFloat(v) }));
  };

  const apply = async () => {
    const overrideJson = { ...f };
    const { error: updErr } = await supabase
      .from("payroll_lines" as never)
      .update({ is_overridden: true, override_json: overrideJson } as never)
      .eq("id", line.id);
    if (updErr) {
      onSaved(updErr.message);
      return;
    }
    try {
      await rebuildPayrollLine(line.employee_id, cycleId);
    } catch (e) {
      onSaved(e instanceof Error ? e.message : "Rebuild failed");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["hr-payroll-lines"] });
    onSaved("Override applied");
    onClose();
  };

  const clear = async () => {
    const { error } = await supabase.rpc("fn_clear_payroll_override" as never, {
      p_employee: line.employee_id,
      p_cycle: cycleId,
    } as never);
    if (error) {
      onSaved(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["hr-payroll-lines"] });
    onSaved("Override cleared");
    onClose();
  };

  const Row = (k: keyof OverrideFields, label: string) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "7px 0",
        borderBottom: "1px solid #eef0f5",
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--mut)" }}>auto: {auto?.[k] ?? "…"}</div>
      </div>
      <input
        className={`calc-input${auto && f[k] !== auto[k] ? " ovr" : ""}`}
        type="number"
        step="0.5"
        value={f[k]}
        onChange={(e) => setNum(k, e.target.value)}
      />
    </div>
  );

  return (
    <ModalShell
      title={`Override — ${line.employees?.full_name ?? "Employee"}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-bad" onClick={() => void clear()}>
            Clear
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void apply()}>
            Apply Override
          </button>
        </>
      }
    >
      <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10 }}>
        Auto = attendance roll-up + approvals. Override any field (gold = changed).
      </div>
      {Row("late", "Late Comings")}
      {Row("mispunch", "Mispunch + Absent")}
      {Row("leaves", "Leaves")}
      {Row("paid_leaves", "Paid Leaves")}
      {Row("comp_off", "Comp-Off")}
      {Row("ul", "Unauthorized Leave")}
      {Row("sandwich", "Sandwich Leave")}
      {Row("unpaid_training", "Unpaid Training")}
    </ModalShell>
  );
}

export default function HrVerifyPage() {
  const { cycleId } = useParams<{ cycleId?: string }>();
  const { cycle: ctxCycle, can, fire } = useHrAccess();
  const qc = useQueryClient();
  const [branch, setBranch] = useState("All");
  const [ovrLine, setOvrLine] = useState<PayrollLineRow | null>(null);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");

  const cycle = ctxCycle;
  const effectiveCycleId = cycleId ?? cycle?.id;
  const { data: lines = [], isLoading } = useHrPayrollLines(effectiveCycleId);

  const branches = useMemo(
    () => ["All", ...new Set(lines.map((l) => l.employees?.branches?.name ?? "Unknown"))],
    [lines],
  );

  const filtered = useMemo(
    () =>
      lines.filter((l) => branch === "All" || l.employees?.branches?.name === branch),
    [lines, branch],
  );

  const currencyTotals = useMemo(() => {
    const acc: Record<string, { gross: number; net: number }> = {};
    for (const r of filtered) {
      const cur = employeeCurrency(r.employees);
      if (!acc[cur]) acc[cur] = { gross: 0, net: 0 };
      acc[cur].gross += r.gross_earned;
      acc[cur].net += r.net_salary;
    }
    return Object.entries(acc);
  }, [filtered]);
  const rowMoney = (r: PayrollLineRow, n: number | null | undefined) =>
    formatMoney(n, employeeCurrency(r.employees));
  const hasCanada = filtered.some(
    (l) => l.employees?.payroll_country === "CA" || l.employees?.salary_currency === "CAD",
  );
  const dedLabels = hasCanada
    ? { pf: "CPP", esic: "EI", pt: "Tax+" }
    : { pf: "PF", esic: "ESIC", pt: "PT" };
  const cycleStatus = cycle?.status ?? "Draft";
  const locked = cycleStatus === "Locked" || cycleStatus === "Paid";
  const editable = ["Draft", "Processed", "Approved"].includes(cycleStatus);

  const refreshCycle = async () => {
    await qc.invalidateQueries({ queryKey: ["hr-payroll-cycle"] });
    await qc.invalidateQueries({ queryKey: ["hr-payroll-lines"] });
    await qc.invalidateQueries({ queryKey: ["hr-payroll-preview"] });
  };

  const rebuildRegister = async () => {
    if (!effectiveCycleId || !cycle) return;
    if (!confirm("Rebuild payroll lines for all active employees on this cycle?")) return;
    try {
      const count = await rebuildPayrollCycle(effectiveCycleId);
      await hrAudit("Payroll Register Rebuilt", cycle.label, cycleStatus, cycleStatus);
      fire(`Register rebuilt (${count} employees)`);
      await refreshCycle();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Rebuild failed — apply migration 19");
    }
  };

  const processCycle = async () => {
    if (!effectiveCycleId || !cycle) return;
    if (!confirm("Process payroll? Lines rebuild + processed snapshots (attendance, leave, policies) are captured.")) return;
    try {
      await processPayrollCycle(effectiveCycleId);
      await hrAudit("Payroll Processed", cycle.label, "Draft", "Processed");
      fire("Payroll processed — review register before approval");
      await refreshCycle();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Process failed — apply migration 19");
    }
  };

  const approveCycle = async () => {
    if (!effectiveCycleId || !cycle) return;
    if (!confirm("Approve payroll register for locking?")) return;
    try {
      await approvePayrollCycle(effectiveCycleId);
      await hrAudit("Payroll Approved", cycle.label, "Processed", "Approved");
      fire("Payroll approved — ready to lock");
      await refreshCycle();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Approve failed — apply migration 19");
    }
  };

  const lockCycle = async () => {
    if (!effectiveCycleId || !cycle) return;
    if (!confirm("Lock payroll? All lines will be snapshotted and attendance frozen for this cycle.")) {
      return;
    }
    try {
      await lockPayrollCycle(effectiveCycleId);
      await hrAudit("Payroll Locked", cycle.label, cycleStatus, "Locked");
      fire("Payroll locked — register frozen");
      await refreshCycle();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Lock failed — apply migration 13/19");
    }
  };

  const markPaid = async () => {
    if (!effectiveCycleId || !cycle) return;
    if (!confirm("Mark this payroll cycle as paid?")) return;
    try {
      await markPayrollPaid(effectiveCycleId);
      await hrAudit("Payroll Paid", cycle.label, "Locked", "Paid");
      fire("Payroll marked as paid");
      await refreshCycle();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Mark paid failed — apply migration 19");
    }
  };

  const reopenCycle = async () => {
    if (!effectiveCycleId || !cycle) return;
    try {
      await reopenPayrollCycle(effectiveCycleId, reopenReason.trim() || undefined);
      await hrAudit("Payroll Reopened", cycle.label, cycleStatus, reopenReason.trim() || "—");
      fire("Payroll reopened for corrections");
      setReopenOpen(false);
      setReopenReason("");
      await refreshCycle();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Reopen failed — apply migration 13");
    }
  };

  const exportRegister = async (fmt: "CSV" | "Excel") => {
    if (!effectiveCycleId || !cycle) return;
    try {
      const rows = await fetchPayrollRegisterExport(effectiveCycleId, branch);
      if (rows.length > 0) {
        downloadPayrollRegister(rows, cycle.label, fmt);
        return;
      }
    } catch {
      /* fallback to client lines if RPC not deployed */
    }
    downloadPayrollRegister(
      linesToRegisterRows(filtered, cycle.label, cycle.status),
      cycle.label,
      fmt,
    );
  };

  const exportPdf = async () => {
    if (!effectiveCycleId || !cycle) return;
    let rows;
    try {
      rows = await fetchPayrollRegisterExport(effectiveCycleId, branch);
    } catch {
      rows = linesToRegisterRows(filtered, cycle.label, cycle.status);
    }
    if (!rows.length) {
      rows = linesToRegisterRows(filtered, cycle.label, cycle.status);
    }
    printRegisterPdf(rows, cycle.label, locked);
  };

  const exportBatchSlips = () => {
    if (!cycle) return;
    const items = filtered
      .filter((r) => r.employees)
      .map((r) => ({ emp: r.employees!, line: r }));
    printBatchSalarySlips(items, cycle.label);
  };

  if (!cycle) return <div className="empty">No payroll cycle loaded.</div>;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card-h">
        <div className="row-flex">
          <select
            className="input"
            style={{ width: 140 }}
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <span className="tag">
            {cycle.start_date} – {cycle.end_date} · {cycle.payroll_days}d
          </span>
          {cycleStatus !== "Draft" && (
            <StatusBadge status={cycleStatus} />
          )}
          {locked && (
              <span className="tag" style={{ color: "var(--good)" }}>
                locked snapshots · attendance frozen
              </span>
          )}
          {cycleStatus === "Paid" && cycle.paid_at && (
            <span className="tag">paid {cycle.paid_at.slice(0, 10)}</span>
          )}
        </div>
        <div className="row-flex">
          {can("export") && (
            <>
              {(["Excel", "CSV"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className="btn btn-sm"
                  onClick={() => void exportRegister(f === "CSV" ? "CSV" : "Excel")}
                >
                  ↓ {f}
                </button>
              ))}
              <button type="button" className="btn btn-sm" onClick={() => void exportPdf()}>
                ↓ PDF Register
              </button>
              <button type="button" className="btn btn-sm" onClick={exportBatchSlips}>
                ↓ All Slips PDF
              </button>
            </>
          )}
          {can("approve") && editable && (
            <button type="button" className="btn btn-sm" onClick={() => void rebuildRegister()}>
              Rebuild register
            </button>
          )}
          {can("approve") && (
            <>
              {cycleStatus === "Draft" && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => void processCycle()}>
                  1. Process
                </button>
              )}
              {cycleStatus === "Processed" && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => void approveCycle()}>
                  2. Approve
                </button>
              )}
              {(cycleStatus === "Approved" || cycleStatus === "Draft") && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => void lockCycle()}>
                  {cycleStatus === "Draft" ? "Quick lock" : "3. Lock"}
                </button>
              )}
              {cycleStatus === "Locked" && (
                <>
                  <button type="button" className="btn btn-good btn-sm" onClick={() => void markPaid()}>
                    Mark paid
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => setReopenOpen(true)}>
                    Reopen
                  </button>
                </>
              )}
              {cycleStatus === "Paid" && (
                <span className="tag" style={{ color: "var(--good)" }}>
                  Disbursement complete
                </span>
              )}
            </>
          )}
          {!can("export") && !can("approve") && (
            <span className="muted" style={{ fontSize: 12 }}>
              read-only access
            </span>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        {isLoading ? (
          <div className="empty">Loading register…</div>
        ) : (
          <table style={{ minWidth: 1500 }}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>PF No.</th>
                <th>Branch</th>
                <th>Mis+Abs</th>
                <th>Late</th>
                <th>Leaves</th>
                <th>Paid Lv</th>
                <th>C-Off</th>
                <th>UL</th>
                <th>Sand</th>
                <th>Train</th>
                <th>L-Ded</th>
                <th>M-Ded</th>
                <th>Payable</th>
                <th>Daily</th>
                <th>Gross</th>
                <th>Inc</th>
                <th>Bonus</th>
                <th>{dedLabels.pf}</th>
                <th>{dedLabels.esic}</th>
                <th>{dedLabels.pt}</th>
                <th>Other Ded.</th>
                <th>Net Salary</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="strong">
                    {r.employees?.full_name}
                    {r.is_overridden && (
                      <span className="tag" style={{ marginLeft: 4, color: "var(--clay)" }}>
                        ovr
                      </span>
                    )}
                    <div className="muted mono" style={{ fontSize: 10 }}>
                      {r.employees?.emp_code}
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 10 }}>
                    {r.employees?.pf_number ?? "—"}
                  </td>
                  <td>{r.employees?.branches?.name}</td>
                  <td style={{ textAlign: "center", color: r.mispunch_count ? "var(--clay)" : "inherit" }}>
                    {r.mispunch_count}
                  </td>
                  <td style={{ textAlign: "center" }}>{r.late_count}</td>
                  <td style={{ textAlign: "center" }}>{r.leaves_taken}</td>
                  <td style={{ textAlign: "center" }}>{r.paid_leaves}</td>
                  <td style={{ textAlign: "center", color: r.comp_off ? "var(--good)" : "inherit" }}>
                    {r.comp_off}
                  </td>
                  <td style={{ textAlign: "center", color: r.ul_count ? "var(--rose)" : "inherit" }}>
                    {r.ul_count}
                  </td>
                  <td style={{ textAlign: "center", color: r.sandwich_count ? "var(--rose)" : "inherit" }}>
                    {r.sandwich_count}
                  </td>
                  <td style={{ textAlign: "center", color: r.unpaid_training ? "var(--rose)" : "inherit" }}>
                    {r.unpaid_training}
                  </td>
                  <td style={{ textAlign: "center" }}>{r.late_deduction}</td>
                  <td style={{ textAlign: "center" }}>{r.mispunch_deduction}</td>
                  <td style={{ textAlign: "center", fontWeight: 700, color: "var(--moss)" }}>
                    {r.payable_days}
                  </td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {rowMoney(r, r.daily_rate)}
                  </td>
                  <td className="mono">{rowMoney(r, r.gross_earned)}</td>
                  <td className="mono">{rowMoney(r, r.incentive)}</td>
                  <td className="mono">{rowMoney(r, r.bonus)}</td>
                  <td className="mono" style={{ color: "var(--rose)" }}>
                    {rowMoney(r, r.pf_employee)}
                  </td>
                  <td className="mono" style={{ color: "var(--rose)" }}>
                    {rowMoney(r, r.esic_employee)}
                  </td>
                  <td className="mono" style={{ color: "var(--rose)" }}>
                    {rowMoney(r, r.pt_employee ?? 0)}
                  </td>
                  <td className="mono" style={{ color: "var(--rose)" }}>
                    {rowMoney(r, r.employees?.other_deductions ?? 0)}
                  </td>
                  <td className="mono strong">{rowMoney(r, r.net_salary)}</td>
                  <td>
                    <div className="row-flex">
                      {can("export") && r.employees && cycle && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => printSalarySlip(r.employees!, r, cycle)}
                        >
                          Slip
                        </button>
                      )}
                      {can("override") ? (
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={!editable}
                          onClick={() => setOvrLine(r)}
                        >
                          Ovr
                        </button>
                      ) : (
                        !can("export") && (
                          <span className="muted" style={{ fontSize: 11 }}>
                            —
                          </span>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {currencyTotals.map(([cur, t]) => (
                <tr key={cur} style={{ borderTop: "2px solid var(--line)" }}>
                  <td className="strong" colSpan={15} style={{ textAlign: "right" }}>
                    Totals ({cur})
                  </td>
                  <td className="mono strong">{formatMoney(t.gross, cur)}</td>
                  <td colSpan={6} />
                  <td className="mono strong" style={{ color: "var(--moss)" }}>
                    {formatMoney(t.net, cur)}
                  </td>
                  <td />
                </tr>
              ))}
            </tfoot>
          </table>
        )}
      </div>

      <div className="card" style={{ background: "#f1f5f1", borderColor: "#cfe1f7" }}>
        <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          <strong>Payable</strong> = Days − Leaves + PaidLeaves + CompOff − LateDed − (UL×2) −
          Sandwich − MispunchDed − UnpaidTraining. <strong>Gross</strong> = Daily × Payable.{" "}
          <strong>Net</strong> = Gross + Incentive + Bonus − {dedLabels.pf} − {dedLabels.esic} − {dedLabels.pt}.
          {hasCanada && " Canada employees use CPP/EI/tax mapping."}
        </div>
      </div>

      {ovrLine && effectiveCycleId && (
        <OverrideModal
          line={ovrLine}
          cycleId={effectiveCycleId}
          onClose={() => setOvrLine(null)}
          onSaved={fire}
        />
      )}

      {reopenOpen && (
        <ModalShell
          title="Reopen payroll cycle"
          onClose={() => setReopenOpen(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setReopenOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void reopenCycle()}>
                Reopen cycle
              </button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 12 }}>
            Attendance edits will be allowed again. Provide a reason for the audit trail.
          </p>
          <label className="fld">
            <span className="l">Reason</span>
            <textarea
              className="input"
              rows={3}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="e.g. Late exemption correction for Karan"
            />
          </label>
        </ModalShell>
      )}
    </div>
  );
}
