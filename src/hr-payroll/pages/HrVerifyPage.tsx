import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrReferenceData } from "../hooks/useHrEmployees";
import { useHrPayrollLinesMulti, useHrCycles, rpcRollupInputs } from "../hooks/useHrPayroll";
import { ModalShell } from "../components/ui/ModalShell";
import { StatusBadge } from "../components/ui/StatusBadge";
import { formatMoney, employeeCurrency, payrollCompanyLabel } from "../lib/format";
import { rebuildPayrollLine, hrAudit, lockPayrollCycle, resetPayrollCycleUat, processPayrollCycle, approvePayrollCycle, markPayrollPaid, rebuildPayrollCycle } from "../lib/hrApi";
import { canResetPayrollCycleUat, canUserResetPayrollCycleUat } from "../lib/payrollUatReset";
import { printSalarySlip, isPayrollSlipCycle } from "../lib/salarySlip";
import { downloadPayrollRegister, linesToRegisterRows, printRegisterPdf, printBatchSalarySlips } from "../lib/payrollExport";
import {
  buildBankTransferRows,
  confirmBankTransferExport,
  downloadBankTransferCsv,
  bankTransferValidation,
  formatBankTransferSummary,
} from "../lib/bankTransferExport";
import { PayrollBreakdownModal } from "../components/payroll/PayrollBreakdownModal";
import { PayrollWorkflowStepper } from "../components/payroll/PayrollBreakdownPanel";
import { validatePayrollLines, summarizePayrollValidation } from "../lib/payrollValidation";
import { canProceedWithConfirm } from "../lib/payrollConfirm";
import { buildPayrollReadiness, type ReadinessState } from "../lib/payrollReadiness";
import { payrollWorkflowGuide } from "../lib/payrollWorkflowGuide";
import { filterCyclePayrollAudit } from "../lib/payrollAuditTrail";
import { useHrAuditLogs } from "../hooks/useHrRequests";
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
import type { AuditLogRow, PayrollCycleRow, PayrollLineRow } from "../lib/types";

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

/** HR-16 — client-side page size for the (wide, high-volume) salary register table. */
const REG_PAGE_SIZE = 25;

/** HR-14 — a pending payroll transition awaiting structured confirmation. */
type PendingConfirm = {
  label: string;
  toStatus: string;
  /** Irreversible steps (Lock, Mark paid) require typing the cycle label. */
  requireTyped: boolean;
  run: () => Promise<void>;
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
  const [reason, setReason] = useState(
    typeof line.override_json?._reason === "string" ? (line.override_json._reason as string) : "",
  );
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
    if (!reason.trim()) return;
    const overrideJson = { ...f, _reason: reason.trim() };
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
          <button
            type="button"
            className="btn btn-primary"
            disabled={!reason.trim()}
            onClick={() => void apply()}
          >
            Apply Override
          </button>
        </>
      }
    >
      <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10 }}>
        Auto = attendance roll-up + approvals. Override any field (gold = changed).
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12.5, fontWeight: 500, display: "block", marginBottom: 4 }}>
          Reason for override <span style={{ color: "var(--rose)" }}>*</span>
        </label>
        <textarea
          className="input"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Adjusted for approved late exemption on 2026-06-15"
          style={{ width: "100%" }}
        />
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
  const { cycle: ctxCycle, can, actualCan, assignedRole, fire, pendingCounts } = useHrAccess();
  const { data: ref } = useHrReferenceData();
  const { data: allCycles = [] } = useHrCycles();
  const { data: auditLogs = [] } = useHrAuditLogs();
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
  const [breakdownLine, setBreakdownLine] = useState<PayrollLineRow | null>(null);
  const [uatResetOpen, setUatResetOpen] = useState(false);
  const [regPage, setRegPage] = useState(1); // HR-16 — register pagination
  const [sortKey, setSortKey] = useState<"" | "employee" | "payable_days" | "gross_earned" | "net_salary">("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  // HR-15 — payroll validation gate. `action` present = a blocked action awaiting
  // resolution/override; absent = read-only "review issues" view.
  const [gate, setGate] = useState<{ label: string; action?: () => void | Promise<void> } | null>(null);
  // HR-14 — structured confirmation for payroll state transitions (replaces confirm()).
  const [confirmAction, setConfirmAction] = useState<PendingConfirm | null>(null);
  const [confirmText, setConfirmText] = useState("");

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

  // HR-16 — optional sort, then paginate (footer totals still reflect all filtered rows).
  const sortedFiltered = useMemo(() => {
    if (!sortKey) return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "employee") {
        cmp = (a.employees?.full_name ?? "").localeCompare(b.employees?.full_name ?? "");
      } else {
        cmp = a[sortKey] - b[sortKey];
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);
  const regTotalPages = Math.max(1, Math.ceil(sortedFiltered.length / REG_PAGE_SIZE));
  const safeRegPage = Math.min(regPage, regTotalPages);
  const pageRows = useMemo(
    () => sortedFiltered.slice((safeRegPage - 1) * REG_PAGE_SIZE, safeRegPage * REG_PAGE_SIZE),
    [sortedFiltered, safeRegPage],
  );
  const toggleSort = (key: "employee" | "payable_days" | "gross_earned" | "net_salary") => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };
  const sortArrow = (key: string) => (sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "");
  useEffect(() => {
    setRegPage(1);
  }, [countryFilter, branchId, companyId, cycleFilter, statusFilter, fromDate, toDate]);

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

  // HR-15 — validate the whole selected cycle for workflow actions (attendance/branch
  // filters must not hide errored lines from a cycle-level Process/Lock/Pay), and the
  // visible rows for the bank-file export.
  const workflowLines = useMemo(
    () => (workflowCycleId ? lines.filter((l) => l.cycle_id === workflowCycleId) : []),
    [lines, workflowCycleId],
  );
  const cycleValidation = useMemo(() => validatePayrollLines(workflowLines), [workflowLines]);
  const exportValidation = useMemo(() => validatePayrollLines(filtered), [filtered]);

  // HR-14 — impact figures shown in the confirmation dialog.
  const workflowOverriddenCount = useMemo(
    () => workflowLines.filter((l) => l.is_overridden).length,
    [workflowLines],
  );
  const workflowTotals = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const r of workflowLines) {
      const cur = employeeCurrency(r.employees);
      acc[cur] = (acc[cur] ?? 0) + r.net_salary;
    }
    return Object.entries(acc);
  }, [workflowLines]);
  const workflowBank = useMemo(() => {
    const rows = buildBankTransferRows(workflowLines);
    const { missingBank } = bankTransferValidation(rows);
    return { total: rows.length, missing: missingBank.length };
  }, [workflowLines]);
  // HR-19 — payroll lifecycle audit trail for the selected cycle (from audit_log).
  const cycleAuditTrail = useMemo(
    () => filterCyclePayrollAudit(auditLogs as AuditLogRow[], workflowCycle?.label ?? ""),
    [auditLogs, workflowCycle?.label],
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
  const cycleStatus = workflowCycle?.status ?? "Draft";
  const locked = cycleStatus === "Locked" || cycleStatus === "Paid";
  const editable = canRunCycleWorkflow && ["Draft", "Processed", "Approved"].includes(cycleStatus);
  const canUatResetCycle = canResetPayrollCycleUat({
    cycle: workflowCycle,
    hasSelectedCycle: canRunCycleWorkflow,
    role: assignedRole,
    canConfigure: actualCan("configure"),
    canApprove: actualCan("approve"),
  });
  const showUatResetNote = canUserResetPayrollCycleUat({
    role: assignedRole,
    canConfigure: actualCan("configure"),
    canApprove: actualCan("approve"),
  });

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
      fire(e instanceof Error ? e.message : "Rebuild failed — please try again or contact support");
    }
  };

  const processCycle = async () => {
    if (!workflowCycleId || !workflowCycle) return;
    try {
      await processPayrollCycle(workflowCycleId);
      await hrAudit("Payroll Processed", workflowCycle.label, "Draft", "Processed");
      fire("Payroll processed — review register before approval");
      await refreshCycle();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Process failed — please try again or contact support");
    }
  };

  const approveCycle = async () => {
    if (!workflowCycleId || !workflowCycle) return;
    try {
      await approvePayrollCycle(workflowCycleId);
      await hrAudit("Payroll Approved", workflowCycle.label, "Processed", "Approved");
      fire("Payroll approved — ready to lock");
      await refreshCycle();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Approve failed — please try again or contact support");
    }
  };

  const lockCycle = async () => {
    if (!workflowCycleId || !workflowCycle) return;
    try {
      await lockPayrollCycle(workflowCycleId);
      await hrAudit("Payroll Locked", workflowCycle.label, cycleStatus, "Locked");
      fire("Payroll locked — register frozen");
      await refreshCycle();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Lock failed — please try again or contact support");
    }
  };

  const markPaid = async () => {
    if (!workflowCycleId || !workflowCycle) return;
    try {
      await markPayrollPaid(workflowCycleId);
      await hrAudit("Payroll Paid", workflowCycle.label, "Locked", "Paid");
      fire("Payroll marked as paid");
      await refreshCycle();
    } catch (e) {
      fire(e instanceof Error ? e.message : "Mark paid failed — please try again or contact support");
    }
  };

  const uatResetCycle = async () => {
    if (!workflowCycleId || !workflowCycle) return;
    try {
      await resetPayrollCycleUat(workflowCycleId);
      fire("Payroll cycle reset for UAT — run Process salary again");
      setUatResetOpen(false);
      await refreshCycle();
    } catch (e) {
      fire(e instanceof Error ? e.message : "UAT reset failed — please try again or contact support");
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
      .map((r) => ({
        emp: r.employees!,
        line: r,
        cycle: cyclesById[r.cycle_id],
      }))
      .filter((item) => item.cycle && isPayrollSlipCycle(item.cycle.status));
    if (!items.length) {
      fire("Salary slips are available only for Locked or Paid cycles");
      return;
    }
    printBatchSalarySlips(items, exportLabel);
  };

  const doBankExport = () => {
    const rows = buildBankTransferRows(filtered);
    const { totalNet } = bankTransferValidation(rows);
    if (!confirmBankTransferExport(rows)) return;
    downloadBankTransferCsv(rows, exportFileStem);
    fire(`Bank file exported · ${formatBankTransferSummary(totalNet)}`);
  };

  const exportBankTransfer = () => {
    if (!filtered.length) {
      fire("No payroll records match the current filters");
      return;
    }
    // HR-15 — never let hard errors reach the bank file.
    if (exportValidation.hasErrors) {
      setGate({ label: "Export bank transfer", action: doBankExport });
      return;
    }
    doBankExport();
  };

  // HR-15 — run a forward workflow action only if the cycle has no hard errors;
  // otherwise open the gate (which offers an audited admin override).
  const guard = (label: string, action: () => void | Promise<void>) => {
    if (cycleValidation.hasErrors) {
      setGate({ label, action });
      return;
    }
    void action();
  };

  const overrideAndRun = async () => {
    const pending = gate?.action;
    const usedValidation = gate?.label === "Export bank transfer" ? exportValidation : cycleValidation;
    setGate(null);
    if (!pending) return;
    if (workflowCycle) {
      await hrAudit(
        "Payroll Validation Overridden",
        `${workflowCycle.label} · ${gate?.label ?? "action"} · ${usedValidation.errorCount} error(s), ${usedValidation.warningCount} warning(s)`,
        cycleStatus,
        cycleStatus,
      );
    }
    await pending();
  };

  // HR-14 — open the structured confirmation dialog for a transition.
  const openConfirm = (cfg: PendingConfirm) => {
    setConfirmText("");
    setConfirmAction(cfg);
  };
  const requestProcess = () =>
    openConfirm({ label: "Process salary", toStatus: "Processed", requireTyped: false, run: processCycle });
  const requestApprove = () =>
    openConfirm({ label: "Approve payroll", toStatus: "Approved", requireTyped: false, run: approveCycle });
  const requestLock = () =>
    openConfirm({ label: "Lock payroll", toStatus: "Locked", requireTyped: true, run: lockCycle });
  const requestMarkPaid = () =>
    openConfirm({ label: "Mark paid", toStatus: "Paid", requireTyped: true, run: markPaid });

  const confirmProceed = async () => {
    const act = confirmAction;
    if (!act) return;
    if (!canProceedWithConfirm(act.requireTyped, confirmText, workflowCycle?.label ?? "")) return;
    setConfirmAction(null);
    setConfirmText("");
    await act.run();
  };

  if (!ctxCycle) return <div className="empty">No payroll cycle loaded.</div>;

  return (
    <div className="page-grid">
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
              <button type="button" className="btn btn-sm" onClick={exportBankTransfer}>
                ↓ Bank Transfer CSV
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
                <button type="button" className="btn btn-primary btn-sm" onClick={() => guard("Process salary", requestProcess)}>
                  Process salary
                </button>
              )}
              {cycleStatus === "Processed" && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => guard("Approve payroll", requestApprove)}>
                  Approve
                </button>
              )}
              {cycleStatus === "Approved" && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => guard("Lock payroll", requestLock)}>
                  Lock payroll
                </button>
              )}
              {cycleStatus === "Locked" && (
                <button type="button" className="btn btn-good btn-sm" onClick={() => guard("Mark paid", requestMarkPaid)}>
                  Mark paid
                </button>
              )}
              {cycleStatus === "Paid" && (
                <span className="tag" style={{ color: "var(--good)" }}>
                  Disbursement complete
                </span>
              )}
              {canUatResetCycle && (
                <button type="button" className="btn btn-sm" onClick={() => setUatResetOpen(true)}>
                  Reset Payroll Cycle (UAT)
                </button>
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

      {canRunCycleWorkflow && workflowCycle && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10 }}>
            Attendance → Payable Days → Verify → Process salary → Approve → Lock → Paid.
            Salary is computed from <strong>monthly gross × payable days</strong>, never from CTC.
          </div>
          <PayrollWorkflowStepper status={cycleStatus} />
          {(() => {
            const g = payrollWorkflowGuide(cycleStatus);
            return (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                <span className="muted">Current step:</span>
                <strong>{g.currentLabel}</strong>
                {g.nextActionLabel ? (
                  <>
                    <span className="muted">· Next:</span>
                    <strong>{g.nextActionLabel}</strong>
                    {g.nextHint && <span className="muted">— {g.nextHint}</span>}
                    {g.nextIrreversible && (
                      <span className="tag" style={{ color: "var(--rose)" }}>
                        irreversible
                      </span>
                    )}
                  </>
                ) : (
                  <span className="muted">— {g.nextHint}</span>
                )}
              </div>
            );
          })()}
          <div
            style={{
              fontSize: 12.5,
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span className="muted">Validation:</span>
            <span className="mono">{summarizePayrollValidation(cycleValidation)}</span>
            {cycleValidation.hasErrors ? (
              <>
                <span className="tag" style={{ color: "var(--rose)" }}>
                  Blocks processing
                </span>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setGate({ label: "Review validation" })}
                >
                  Review issues
                </button>
              </>
            ) : cycleValidation.hasWarnings ? (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setGate({ label: "Review validation" })}
              >
                Review warnings
              </button>
            ) : (
              <span className="tag" style={{ color: "var(--good)" }}>
                Ready
              </span>
            )}
          </div>
          {(() => {
            // HR-18 (informational only) — surface pending approvals to review before locking.
            // Read-only; does not block any transition.
            const pend = {
              leave: pendingCounts.leave ?? 0,
              compoff: pendingCounts.compoff ?? 0,
              late: pendingCounts.late ?? 0,
              mispunch: pendingCounts.mispunch ?? 0,
            };
            const total = pend.leave + pend.compoff + pend.late + pend.mispunch;
            if (total === 0) return null;
            return (
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--clay)" }}>
                {total} pending approval{total === 1 ? "" : "s"} to review before locking —{" "}
                {pend.leave} leave · {pend.compoff} comp-off · {pend.late} late · {pend.mispunch}{" "}
                mispunch.{" "}
                <Link to="/hr/approvals">Open Approval Center →</Link>
              </div>
            );
          })()}
          {cycleAuditTrail.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>
                Cycle history
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                {cycleAuditTrail.map((a) => (
                  <div key={a.id} style={{ fontSize: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className="mono muted" style={{ minWidth: 118 }}>
                      {new Date(a.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span style={{ minWidth: 150 }}>
                      {a.action.replace(/^Payroll /, "")}
                    </span>
                    <span className="muted">by {a.actor_label ?? "—"}</span>
                    {a.prev_value && a.new_value && a.prev_value !== "—" && (
                      <span className="mono muted">
                        {a.prev_value} → {a.new_value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {showUatResetNote && (
            <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 12, marginBottom: 0 }}>
              Reset Payroll Cycle (UAT) is available only for non-production payroll cycles.
            </p>
          )}
        </div>
      )}

      {!canRunCycleWorkflow && validDateRange && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10 }}>
            Payroll runs as a pipeline: <strong>Process → Approve → Lock → Paid</strong>. Select a
            single payroll cycle above to run it step by step.
          </div>
          <PayrollWorkflowStepper status="" />
        </div>
      )}

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
          <>
          <table style={{ minWidth: 1500 }}>
            <thead>
              <tr>
                {showCycleColumn && <th>Cycle</th>}
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("employee")}>
                  Employee{sortArrow("employee")}
                </th>
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
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("payable_days")}>
                  Payable{sortArrow("payable_days")}
                </th>
                <th>Daily</th>
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("gross_earned")}>
                  Gross{sortArrow("gross_earned")}
                </th>
                <th>Inc</th>
                <th>Bonus</th>
                <th>{dedLabels.pf}</th>
                <th>{dedLabels.esic}</th>
                <th>{dedLabels.pt}</th>
                <th>Other Ded.</th>
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("net_salary")}>
                  Net Salary{sortArrow("net_salary")}
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
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
                      <button
                        type="button"
                        className="btn btn-sm"
                        title="View payable days & statutory breakdown"
                        onClick={() => setBreakdownLine(r)}
                      >
                        View
                      </button>
                      {can("export") && r.employees && (() => {
                        const slipCycle = cyclesById[r.cycle_id] ?? workflowCycle;
                        const slipOk = slipCycle && isPayrollSlipCycle(slipCycle.status);
                        return slipOk ? (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => printSalarySlip(r.employees!, r, slipCycle!)}
                          >
                            Slip
                          </button>
                        ) : (
                          <span className="muted" style={{ fontSize: 10 }} title="Lock payroll to print slips">
                            —
                          </span>
                        );
                      })()}
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
          {regTotalPages > 1 && (
            <div
              className="row-flex"
              style={{
                justifyContent: "space-between",
                padding: "10px 12px",
                borderTop: "1px solid var(--line)",
                fontSize: 12.5,
              }}
            >
              <span className="muted">
                Showing {(safeRegPage - 1) * REG_PAGE_SIZE + 1}–
                {Math.min(safeRegPage * REG_PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="row-flex" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={safeRegPage <= 1}
                  onClick={() => setRegPage(safeRegPage - 1)}
                >
                  ← Prev
                </button>
                <span className="muted mono">
                  Page {safeRegPage} / {regTotalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={safeRegPage >= regTotalPages}
                  onClick={() => setRegPage(safeRegPage + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
          </>
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

      {breakdownLine && (cyclesById[breakdownLine.cycle_id] ?? ctxCycle) && (
        <PayrollBreakdownModal
          line={breakdownLine}
          cycle={(cyclesById[breakdownLine.cycle_id] ?? ctxCycle)!}
          onClose={() => setBreakdownLine(null)}
        />
      )}

      {ovrLine && (
        <OverrideModal
          line={ovrLine}
          cycleId={ovrLine.cycle_id}
          onClose={() => setOvrLine(null)}
          onSaved={fire}
        />
      )}

      {uatResetOpen && (
        <ModalShell
          title="Reset Payroll Cycle (UAT)"
          onClose={() => setUatResetOpen(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setUatResetOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void uatResetCycle()}>
                Continue
              </button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 12 }}>
            This action is intended for UAT only.
          </p>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 12 }}>
            It will remove generated payroll results for the selected payroll cycle.
          </p>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 8 }}>
            The following will be preserved:
          </p>
          <ul style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 0, marginBottom: 12, paddingLeft: 20 }}>
            <li>Employee Master</li>
            <li>Attendance</li>
            <li>Salary Structure</li>
            <li>Payroll Cycle</li>
            <li>Audit History</li>
          </ul>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 12 }}>
            This action cannot be undone.
          </p>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 0 }}>
            Do you want to continue?
          </p>
        </ModalShell>
      )}

      {gate && (() => {
        const v = gate.label === "Export bank transfer" ? exportValidation : cycleValidation;
        const isReview = !gate.action;
        const canOverride = actualCan("configure");
        return (
          <ModalShell
            title={isReview ? "Payroll validation" : `Validation blocks: ${gate.label}`}
            onClose={() => setGate(null)}
            footer={
              <>
                <button type="button" className="btn" onClick={() => setGate(null)}>
                  Close
                </button>
                {!isReview && v.hasErrors && canOverride && (
                  <button type="button" className="btn btn-bad" onClick={() => void overrideAndRun()}>
                    Override &amp; continue
                  </button>
                )}
              </>
            }
          >
            <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 10 }}>
              {isReview
                ? `Cycle validation summary: ${summarizePayrollValidation(v)}.`
                : `${v.errorCount} hard error(s) across ${v.employeesWithErrors} employee(s) must be resolved before you can ${gate.label.toLowerCase()}.`}
            </div>
            {v.errors.length > 0 && (
              <>
                <div className="strong" style={{ fontSize: 12.5, marginBottom: 4 }}>
                  Errors ({v.errorCount})
                </div>
                <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 12.5 }}>
                  {v.errors.slice(0, 50).map((i, idx) => (
                    <li key={`e-${idx}`}>
                      <span className="mono">{i.empCode}</span> {i.employeeName} — {i.message}
                    </li>
                  ))}
                  {v.errors.length > 50 && <li className="muted">…and {v.errors.length - 50} more</li>}
                </ul>
              </>
            )}
            {v.warnings.length > 0 && (
              <>
                <div className="strong" style={{ fontSize: 12.5, marginBottom: 4 }}>
                  Warnings ({v.warningCount})
                </div>
                <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 12.5, color: "var(--ink-soft)" }}>
                  {v.warnings.slice(0, 50).map((i, idx) => (
                    <li key={`w-${idx}`}>
                      <span className="mono">{i.empCode}</span> {i.employeeName} — {i.message}
                    </li>
                  ))}
                  {v.warnings.length > 50 && <li className="muted">…and {v.warnings.length - 50} more</li>}
                </ul>
              </>
            )}
            {!isReview && v.hasErrors && !canOverride && (
              <div style={{ fontSize: 12, color: "var(--rose)" }}>
                Resolve these in the register (fix attendance / overrides, then Rebuild register), or
                ask a finance admin to review.
              </div>
            )}
          </ModalShell>
        );
      })()}

      {confirmAction && workflowCycle && (() => {
        const irreversible = confirmAction.requireTyped;
        const typedOk = canProceedWithConfirm(irreversible, confirmText, workflowCycle.label);
        const readiness = buildPayrollReadiness({
          lineCount: workflowLines.length,
          overriddenCount: workflowOverriddenCount,
          errorCount: cycleValidation.errorCount,
          warningCount: cycleValidation.warningCount,
          bankTotal: workflowBank.total,
          bankMissing: workflowBank.missing,
          pendingAttendance: (pendingCounts.late ?? 0) + (pendingCounts.mispunch ?? 0),
          pendingLeave: (pendingCounts.leave ?? 0) + (pendingCounts.compoff ?? 0),
        });
        const stateIcon = (s: ReadinessState) =>
          s === "ok" ? "✓" : s === "error" ? "✕" : s === "warn" ? "!" : "•";
        const stateColor = (s: ReadinessState) =>
          s === "ok"
            ? "var(--good)"
            : s === "error"
              ? "var(--rose)"
              : s === "warn"
                ? "var(--clay)"
                : "var(--mut)";
        return (
          <ModalShell
            title={confirmAction.label}
            onClose={() => {
              setConfirmAction(null);
              setConfirmText("");
            }}
            footer={
              <>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setConfirmAction(null);
                    setConfirmText("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn ${confirmAction.toStatus === "Paid" ? "btn-good" : "btn-primary"}`}
                  disabled={!typedOk}
                  onClick={() => void confirmProceed()}
                >
                  {confirmAction.label}
                </button>
              </>
            }
          >
            <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 4 }}>
              <strong>{workflowCycle.label}</strong>: status{" "}
              <span className="mono">{cycleStatus}</span> →{" "}
              <span className="mono strong">{confirmAction.toStatus}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 12 }}>
              <span className="muted">Employees affected: </span>
              <strong>{workflowLines.length}</strong>
              <span className="muted"> · Net total: </span>
              <strong>
                {workflowTotals.length
                  ? workflowTotals.map(([cur, n]) => formatMoney(n, cur)).join(" · ")
                  : "—"}
              </strong>
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>
              Payroll readiness
            </div>
            <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
              {readiness.map((item) => (
                <div
                  key={item.key}
                  style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12.5 }}
                >
                  <span
                    aria-hidden
                    style={{
                      color: stateColor(item.state),
                      fontWeight: 700,
                      width: 14,
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    {stateIcon(item.state)}
                  </span>
                  <span style={{ minWidth: 170 }}>{item.label}</span>
                  <span className="muted">{item.detail}</span>
                </div>
              ))}
            </div>

            {irreversible && (
              <>
                <div style={{ fontSize: 12.5, color: "var(--rose)", marginBottom: 8 }}>
                  This action cannot be undone. Type the cycle name{" "}
                  <span className="mono">{workflowCycle.label}</span> to confirm.
                </div>
                <input
                  className="input"
                  placeholder={workflowCycle.label}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  style={{ width: "100%" }}
                />
              </>
            )}
          </ModalShell>
        );
      })()}
    </div>
  );
}
