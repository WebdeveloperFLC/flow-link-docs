import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrReferenceData } from "../hooks/useHrEmployees";
import { useHrPayrollLinesMulti, useHrCycles, rpcRollupInputs } from "../hooks/useHrPayroll";
import { ModalShell } from "../components/ui/ModalShell";
import { StatusBadge } from "../components/ui/StatusBadge";
import { formatMoney, employeeCurrency, payrollCompanyLabel } from "../lib/format";
import { rebuildPayrollLine, hrAudit, lockPayrollCycle, reopenPayrollCycle, processPayrollCycle, approvePayrollCycle, markPayrollPaid, rebuildPayrollCycle } from "../lib/hrApi";
import { printSalarySlip } from "../lib/salarySlip";
import { downloadPayrollRegister, linesToRegisterRows, printRegisterPdf, printBatchSalarySlips } from "../lib/payrollExport";
import {
  branchesForPayrollCountry,
  companiesForPayrollCountryFilter,
  cyclesInDateRange,
  cyclesMatchingVerifyFilters,
  filterPayrollLines,
  PAYROLL_VERIFY_COUNTRIES,
  PAYROLL_VERIFY_STATUSES,
  todayIsoDate,
  verifyDateRangeLabel,
  verifyExportFileStem,
  type PayrollCountryFilter,
  type PayrollStatusFilter,
} from "../lib/payrollVerifyFilters";
import type { PayrollCycleRow, PayrollLineRow } from "../lib/types";

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
  const { data: ref } = useHrReferenceData();
  const { data: allCycles = [] } = useHrCycles();
  const qc = useQueryClient();
  const [countryFilter, setCountryFilter] = useState<PayrollCountryFilter>("All");
  const [branchId, setBranchId] = useState("All");
  const [companyId, setCompanyId] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [cycleFilter, setCycleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<PayrollStatusFilter>("All");
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [ovrLine, setOvrLine] = useState<PayrollLineRow | null>(null);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");

  useEffect(() => {
    if (!ctxCycle || filtersInitialized) return;
    setFromDate(ctxCycle.start_date);
    setToDate(ctxCycle.end_date);
    setCycleFilter(cycleId ?? ctxCycle.id);
    setFiltersInitialized(true);
  }, [ctxCycle, cycleId, filtersInitialized]);

  const validDateRange = Boolean(fromDate && toDate && fromDate <= toDate);

  const cycleOptions = useMemo(
    () => (validDateRange ? cyclesInDateRange(allCycles, fromDate, toDate) : []),
    [allCycles, fromDate, toDate, validDateRange],
  );

  const matchingCycles = useMemo(
    () =>
      validDateRange
        ? cyclesMatchingVerifyFilters(allCycles, fromDate, toDate, cycleFilter, statusFilter)
        : [],
    [allCycles, fromDate, toDate, cycleFilter, statusFilter, validDateRange],
  );

  const matchingCycleIds = useMemo(() => matchingCycles.map((c) => c.id), [matchingCycles]);

  const cyclesById = useMemo(
    () => Object.fromEntries(allCycles.map((c) => [c.id, c] as const)),
    [allCycles],
  ) as Record<string, PayrollCycleRow>;

  const { data: lines = [], isLoading } = useHrPayrollLinesMulti(matchingCycleIds);

  const branchOptions = useMemo(
    () => branchesForPayrollCountry(ref?.branches ?? [], countryFilter),
    [ref?.branches, countryFilter],
  );

  const companyOptions = useMemo(
    () => companiesForPayrollCountryFilter(ref?.companies ?? [], countryFilter),
    [ref?.companies, countryFilter],
  );

  useEffect(() => {
    if (branchId !== "All" && !branchOptions.some((b) => b.id === branchId)) {
      setBranchId("All");
    }
    if (companyId !== "All" && !companyOptions.some((c) => c.id === companyId)) {
      setCompanyId("All");
    }
  }, [branchId, companyId, branchOptions, companyOptions]);

  useEffect(() => {
    if (cycleFilter !== "All" && !cycleOptions.some((c) => c.id === cycleFilter)) {
      setCycleFilter("All");
    }
  }, [cycleFilter, cycleOptions]);

  const filtered = useMemo(
    () => filterPayrollLines(lines, countryFilter, branchId, companyId),
    [lines, countryFilter, branchId, companyId],
  );

  const registerRows = useMemo(
    () =>
      filtered.flatMap((line) => {
        const c = cyclesById[line.cycle_id];
        return linesToRegisterRows([line], c?.label ?? "", c?.status ?? "");
      }),
    [filtered, cyclesById],
  );

  const showCycleColumn = cycleFilter === "All" || matchingCycleIds.length > 1;

  const workflowCycle =
    cycleFilter !== "All"
      ? cyclesById[cycleFilter]
      : matchingCycles.length === 1
        ? matchingCycles[0]
        : ctxCycle;

  const workflowCycleId = workflowCycle?.id;
  const canRunCycleWorkflow = cycleFilter !== "All" && !!cyclesById[cycleFilter];
  const exportLabel = verifyDateRangeLabel(fromDate, toDate);
  const exportFileStem = verifyExportFileStem(fromDate, toDate);

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
  const cycleStatus = workflowCycle?.status ?? "Draft";
  const locked = cycleStatus === "Locked" || cycleStatus === "Paid";
  const editable = canRunCycleWorkflow && ["Draft", "Processed", "Approved"].includes(cycleStatus);

  const refreshCycle = async () => {
    await qc.invalidateQueries({ queryKey: ["hr-payroll-cycle"] });
    await qc.invalidateQueries({ queryKey: ["hr-payroll-lines"] });
    await qc.invalidateQueries({ queryKey: ["hr-payroll-preview"] });
  };

  const rebuildRegister = async () => {
    if (!workflowCycleId || !workflowCycle) return;
    if (!confirm("Rebuild payroll lines for all active employees on this cycle?")) return;
    try {
      const count = await rebuildPayrollCycle(workflowCycleId);
      await hrAudit("Payroll Register Rebuilt", workflowCycle.label, cycleStatus, cycleStatus);
      fire(`Register rebuilt (${count} employees)`);
      await refreshCycle();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Rebuild failed — apply migration 19");
    }
  };

  const processCycle = async () => {
    if (!workflowCycleId || !workflowCycle) return;
    if (!confirm("Process payroll? Lines rebuild + processed snapshots (attendance, leave, policies) are captured.")) return;
    try {
      await processPayrollCycle(workflowCycleId);
      await hrAudit("Payroll Processed", workflowCycle.label, "Draft", "Processed");
      fire("Payroll processed — review register before approval");
      await refreshCycle();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Process failed — apply migration 19");
    }
  };

  const approveCycle = async () => {
    if (!workflowCycleId || !workflowCycle) return;
    if (!confirm("Approve payroll register for locking?")) return;
    try {
      await approvePayrollCycle(workflowCycleId);
      await hrAudit("Payroll Approved", workflowCycle.label, "Processed", "Approved");
      fire("Payroll approved — ready to lock");
      await refreshCycle();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Approve failed — apply migration 19");
    }
  };

  const lockCycle = async () => {
    if (!workflowCycleId || !workflowCycle) return;
    if (!confirm("Lock payroll? All lines will be snapshotted and attendance frozen for this cycle.")) {
      return;
    }
    try {
      await lockPayrollCycle(workflowCycleId);
      await hrAudit("Payroll Locked", workflowCycle.label, cycleStatus, "Locked");
      fire("Payroll locked — register frozen");
      await refreshCycle();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Lock failed — apply migration 13/19");
    }
  };

  const markPaid = async () => {
    if (!workflowCycleId || !workflowCycle) return;
    if (!confirm("Mark this payroll cycle as paid?")) return;
    try {
      await markPayrollPaid(workflowCycleId);
      await hrAudit("Payroll Paid", workflowCycle.label, "Locked", "Paid");
      fire("Payroll marked as paid");
      await refreshCycle();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Mark paid failed — apply migration 19");
    }
  };

  const reopenCycle = async () => {
    if (!workflowCycleId || !workflowCycle) return;
    try {
      await reopenPayrollCycle(workflowCycleId, reopenReason.trim() || undefined);
      await hrAudit("Payroll Reopened", workflowCycle.label, cycleStatus, reopenReason.trim() || "—");
      fire("Payroll reopened for corrections");
      setReopenOpen(false);
      setReopenReason("");
      await refreshCycle();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Reopen failed — apply migration 13");
    }
  };

  const exportRegister = (fmt: "CSV" | "Excel") => {
    if (!registerRows.length) {
      fire("No payroll records match the current filters");
      return;
    }
    downloadPayrollRegister(registerRows, exportFileStem, fmt);
  };

  const exportPdf = () => {
    if (!registerRows.length) {
      fire("No payroll records match the current filters");
      return;
    }
    const exportLocked = matchingCycles.length > 0 && matchingCycles.every(
      (c) => c.status === "Locked" || c.status === "Paid",
    );
    printRegisterPdf(registerRows, exportLabel, exportLocked);
  };

  const exportBatchSlips = () => {
    if (!filtered.length) {
      fire("No payroll records match the current filters");
      return;
    }
    const items = filtered
      .filter((r) => r.employees)
      .map((r) => ({ emp: r.employees!, line: r }));
    printBatchSalarySlips(items, exportLabel);
  };

  if (!ctxCycle) return <div className="empty">No payroll cycle loaded.</div>;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card-h">
        <div className="row-flex">
          <span className="tag">
            {exportLabel}
            {workflowCycle && cycleFilter !== "All" && (
              <span className="muted" style={{ marginLeft: 6 }}>
                · {workflowCycle.label}
              </span>
            )}
          </span>
          <span className="tag muted">
            {filtered.length} of {lines.length} records
            {matchingCycles.length > 1 && ` · ${matchingCycles.length} cycles`}
          </span>
          {cycleStatus !== "Draft" && (
            <StatusBadge status={cycleStatus} />
          )}
          {locked && canRunCycleWorkflow && (
              <span className="tag" style={{ color: "var(--good)" }}>
                locked snapshots · attendance frozen
              </span>
          )}
          {cycleStatus === "Paid" && workflowCycle?.paid_at && canRunCycleWorkflow && (
            <span className="tag">paid {workflowCycle.paid_at.slice(0, 10)}</span>
          )}
          {!validDateRange && (
            <span className="tag" style={{ color: "var(--rose)" }}>Invalid date range</span>
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
                  onClick={() => exportRegister(f === "CSV" ? "CSV" : "Excel")}
                >
                  ↓ {f}
                </button>
              ))}
              <button type="button" className="btn btn-sm" onClick={() => exportPdf()}>
                ↓ PDF Register
              </button>
              <button type="button" className="btn btn-sm" onClick={exportBatchSlips}>
                ↓ All Slips PDF
              </button>
            </>
          )}
          {can("approve") && editable && canRunCycleWorkflow && (
            <button type="button" className="btn btn-sm" onClick={() => void rebuildRegister()}>
              Rebuild register
            </button>
          )}
          {can("approve") && canRunCycleWorkflow && (
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
          {can("approve") && !canRunCycleWorkflow && (
            <span className="muted" style={{ fontSize: 12 }}>
              Select a payroll cycle to process / approve / lock
            </span>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div className="row-flex" style={{ gap: 12, flexWrap: "wrap" }}>
          <label className="fld" style={{ minWidth: 160 }}>
            <span className="l">Payroll Country</span>
            <select
              className="input"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value as PayrollCountryFilter)}
            >
              {PAYROLL_VERIFY_COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="fld" style={{ minWidth: 200 }}>
            <span className="l">Branch</span>
            <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="All">All Branches</option>
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="fld" style={{ minWidth: 280 }}>
            <span className="l">Payroll Company</span>
            <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="All">All Companies</option>
              {companyOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {payrollCompanyLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <label className="fld" style={{ minWidth: 150 }}>
            <span className="l">From Date</span>
            <input
              className="input"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label className="fld" style={{ minWidth: 150 }}>
            <span className="l">To Date</span>
            <input
              className="input"
              type="date"
              value={toDate}
              max={todayIsoDate()}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
          <label className="fld" style={{ minWidth: 220 }}>
            <span className="l">Payroll Cycle</span>
            <select className="input" value={cycleFilter} onChange={(e) => setCycleFilter(e.target.value)}>
              <option value="All">All cycles in range</option>
              {cycleOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} ({c.start_date} – {c.end_date})
                </option>
              ))}
            </select>
          </label>
          <label className="fld" style={{ minWidth: 160 }}>
            <span className="l">Payroll Status</span>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PayrollStatusFilter)}
            >
              {PAYROLL_VERIFY_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        {isLoading ? (
          <div className="empty">Loading register…</div>
        ) : matchingCycleIds.length === 0 ? (
          <div className="empty">No payroll cycles match the selected date range and filters.</div>
        ) : filtered.length === 0 ? (
          <div className="empty">No payroll records match the selected filters.</div>
        ) : (
          <table style={{ minWidth: 1500 }}>
            <thead>
              <tr>
                {showCycleColumn && <th>Cycle</th>}
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
                  {showCycleColumn && (
                    <td style={{ fontSize: 11.5 }}>
                      {cyclesById[r.cycle_id]?.label ?? "—"}
                      <div className="muted mono" style={{ fontSize: 10 }}>
                        {cyclesById[r.cycle_id]?.status}
                      </div>
                    </td>
                  )}
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
                      {can("export") && r.employees && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            const slipCycle = cyclesById[r.cycle_id] ?? workflowCycle;
                            if (slipCycle) printSalarySlip(r.employees!, r, slipCycle);
                          }}
                        >
                          Slip
                        </button>
                      )}
                      {can("override") ? (
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={
                            !["Draft", "Processed", "Approved"].includes(
                              cyclesById[r.cycle_id]?.status ?? "",
                            )
                          }
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
                  <td className="strong" colSpan={showCycleColumn ? 16 : 15} style={{ textAlign: "right" }}>
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

      {ovrLine && (
        <OverrideModal
          line={ovrLine}
          cycleId={ovrLine.cycle_id}
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
