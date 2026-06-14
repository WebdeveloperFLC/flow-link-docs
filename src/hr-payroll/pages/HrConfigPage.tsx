import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrPolicies } from "../hooks/useHrRequests";
import { HR_ORG_ID } from "../lib/constants";
import { hrAudit, accrueLeaveBalances } from "../lib/hrApi";
import type { PolicyRow } from "../lib/types";

const TABS = ["Payroll Cycle", "Late Coming", "Mispunch", "Leave", "Sandwich & UL", "Overtime", "Canada Deductions", "Workflow"] as const;
type Tab = (typeof TABS)[number];

const DOMAIN_MAP: Record<Exclude<Tab, "Payroll Cycle" | "Workflow" | "Overtime" | "Canada Deductions">, string> = {
  "Late Coming": "late",
  Mispunch: "mispunch",
  Leave: "leave",
  "Sandwich & UL": "sandwich_ul",
};

const DEFAULT_CONFIG: Record<string, Record<string, string>> = {
  late: { report_time: "10:00", grace_until: "10:05", half_day_after: "60 min", slab_base: "1–3 = 0 day" },
  mispunch: { free_per_month: "2", beyond: "(n−2)×0.5", report_window: "Same day", approval: "Mgr → HR" },
  leave: {
    six_day_annual: "18 (1.5/mo)",
    five_day_annual: "10",
    sick_cap: "8/yr",
    carry_forward: "Mgmt approval",
    encashment: "Eligible after confirm",
    probation_leave: "None",
  },
  sandwich_ul: { sandwich_mult: "1", sandwich_cap: "2/yr", ul_mult: "2", auto_resign: "3 consec. UL" },
  workflow: { enabled: "true", chain: "Manager,HR", skip_manager_when_no_mgr: "true" },
  overtime: { mode: "display", rate_multiplier: "1.5", hours_per_day: "8", min_ot_minutes: "30" },
  canada_deductions: { cpp_rate: "0.0595", ei_rate: "0.0166", income_tax_flat: "0", other_deductions: "0" },
};

function Fld({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="fld">
      <span className="l">{label}</span>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export default function HrConfigPage() {
  const { cycle, can, fire } = useHrAccess();
  const qc = useQueryClient();
  const { data: policies = [] } = useHrPolicies();
  const [tab, setTab] = useState<Tab>("Payroll Cycle");
  const [days, setDays] = useState(cycle?.payroll_days ?? 30);
  const [startDate, setStartDate] = useState(cycle?.start_date ?? "");
  const [endDate, setEndDate] = useState(cycle?.end_date ?? "");
  const [policyDraft, setPolicyDraft] = useState<Record<string, string>>({});

  const domain = tab !== "Payroll Cycle" && tab !== "Workflow" && tab !== "Overtime" && tab !== "Canada Deductions" ? DOMAIN_MAP[tab] : null;
  const workflowPolicy = useMemo(() => {
    return (policies as PolicyRow[]).find((p) => p.domain === "workflow");
  }, [policies]);
  const overtimePolicy = useMemo(() => {
    return (policies as PolicyRow[]).find((p) => p.domain === "overtime");
  }, [policies]);
  const canadaPolicy = useMemo(() => {
    return (policies as PolicyRow[]).find((p) => p.domain === "canada_deductions");
  }, [policies]);
  const currentPolicy = useMemo(() => {
    if (!domain) return null;
    return (policies as PolicyRow[]).find((p) => p.domain === domain);
  }, [policies, domain]);

  const configFields = useMemo(() => {
    if (!domain) return [];
    const base = currentPolicy?.config ?? DEFAULT_CONFIG[domain] ?? {};
    return Object.entries({ ...base, ...policyDraft }).map(([k, v]) => ({
      key: k,
      label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: String(policyDraft[k] ?? v),
    }));
  }, [domain, currentPolicy, policyDraft]);

  const saveCycle = async () => {
    if (!cycle) {
      fire("No cycle loaded");
      return;
    }
    const { error } = await supabase
      .from("payroll_cycles" as never)
      .update({
        payroll_days: days,
        start_date: startDate || cycle.start_date,
        end_date: endDate || cycle.end_date,
      } as never)
      .eq("id", cycle.id);
    if (error) {
      fire(error.message);
      return;
    }
    await hrAudit("Cycle Updated", cycle.label, String(cycle.payroll_days), String(days));
    fire("Payroll cycle saved");
    await qc.invalidateQueries({ queryKey: ["hr-payroll-cycle"] });
  };

  const savePolicy = async () => {
    if (!domain || !can("configure")) return;
    const config = Object.fromEntries(configFields.map((f) => [f.key, f.value]));
    const version = (currentPolicy?.version ?? 0) + 1;
    const { error } = await supabase.from("policies" as never).insert({
      org_id: HR_ORG_ID,
      domain,
      effective_from: new Date().toISOString().slice(0, 10),
      version,
      config,
    } as never);
    if (error) {
      fire(error.message);
      return;
    }
    await hrAudit("Policy Saved", tab, `v${currentPolicy?.version ?? 0}`, `v${version}`);
    fire("Policy saved as new version");
    setPolicyDraft({});
    await qc.invalidateQueries({ queryKey: ["hr-policies"] });
  };

  const runAccrual = async () => {
    if (!can("configure")) return;
    try {
      const n = await accrueLeaveBalances(HR_ORG_ID);
      await hrAudit("Leave Accrual", "All employees", "—", `${n} updated`);
      fire(`Monthly accrual applied (${n} employees)`);
      await qc.invalidateQueries({ queryKey: ["hr-leave-balances"] });
    } catch (e) {
      fire(e instanceof Error ? e.message : "Accrual failed — apply migration 11");
    }
  };

  const saveWorkflow = async () => {
    if (!can("configure")) return;
    const chainRaw = String(
      policyDraft.chain ??
        (Array.isArray(workflowPolicy?.config?.chain)
          ? (workflowPolicy!.config.chain as string[]).join(",")
          : "Manager,HR"),
    );
    const config = {
      enabled: (policyDraft.enabled ?? workflowPolicy?.config?.enabled ?? "true") === "true",
      chain: chainRaw.split(",").map((s) => s.trim()).filter(Boolean),
      skip_manager_when_no_mgr:
        (policyDraft.skip_manager_when_no_mgr ??
          workflowPolicy?.config?.skip_manager_when_no_mgr ??
          "true") === "true",
    };
    const version = (workflowPolicy?.version ?? 0) + 1;
    const { error } = await supabase.from("policies" as never).insert({
      org_id: HR_ORG_ID,
      domain: "workflow",
      effective_from: new Date().toISOString().slice(0, 10),
      version,
      config,
    } as never);
    if (error) {
      fire(error.message);
      return;
    }
    await hrAudit("Workflow Saved", "approval chain", `v${workflowPolicy?.version ?? 0}`, `v${version}`);
    fire("Workflow policy saved");
    setPolicyDraft({});
    await qc.invalidateQueries({ queryKey: ["hr-policies"] });
  };

  const saveOvertime = async () => {
    if (!can("configure")) return;
    const config = {
      mode: String(policyDraft.mode ?? overtimePolicy?.config?.mode ?? "display"),
      rate_multiplier: Number(
        policyDraft.rate_multiplier ?? overtimePolicy?.config?.rate_multiplier ?? 1.5,
      ),
      hours_per_day: Number(
        policyDraft.hours_per_day ?? overtimePolicy?.config?.hours_per_day ?? 8,
      ),
      min_ot_minutes: Number(
        policyDraft.min_ot_minutes ?? overtimePolicy?.config?.min_ot_minutes ?? 30,
      ),
    };
    const version = (overtimePolicy?.version ?? 0) + 1;
    const { error } = await supabase.from("policies" as never).insert({
      org_id: HR_ORG_ID,
      domain: "overtime",
      effective_from: new Date().toISOString().slice(0, 10),
      version,
      config,
    } as never);
    if (error) {
      fire(error.message);
      return;
    }
    await hrAudit("OT Policy Saved", config.mode, `v${overtimePolicy?.version ?? 0}`, `v${version}`);
    fire("Overtime policy saved");
    setPolicyDraft({});
    await qc.invalidateQueries({ queryKey: ["hr-policies"] });
  };

  const saveCanada = async () => {
    if (!can("configure")) return;
    const config = {
      cpp_rate: Number(policyDraft.cpp_rate ?? canadaPolicy?.config?.cpp_rate ?? 0.0595),
      ei_rate: Number(policyDraft.ei_rate ?? canadaPolicy?.config?.ei_rate ?? 0.0166),
      income_tax_flat: Number(
        policyDraft.income_tax_flat ?? canadaPolicy?.config?.income_tax_flat ?? 0,
      ),
      other_deductions: Number(
        policyDraft.other_deductions ?? canadaPolicy?.config?.other_deductions ?? 0,
      ),
    };
    const version = (canadaPolicy?.version ?? 0) + 1;
    const { error } = await supabase.from("policies" as never).insert({
      org_id: HR_ORG_ID,
      domain: "canada_deductions",
      effective_from: new Date().toISOString().slice(0, 10),
      version,
      config,
    } as never);
    if (error) {
      fire(error.message);
      return;
    }
    await hrAudit("Canada Policy Saved", "deductions", `v${canadaPolicy?.version ?? 0}`, `v${version}`);
    fire("Canada deductions policy saved");
    setPolicyDraft({});
    await qc.invalidateQueries({ queryKey: ["hr-policies"] });
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="pill-tab">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? "on" : ""}
            onClick={() => {
              setTab(t);
              setPolicyDraft({});
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="card">
        <div className="card-h">
          <h3>{tab}</h3>
          <span className="tag">versioned · effective date</span>
        </div>
        {tab === "Payroll Cycle" ? (
          <>
            <div className="grid g3" style={{ gap: "0 16px" }}>
              <label className="fld">
                <span className="l">Cycle Start</span>
                <input
                  className="input"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label className="fld">
                <span className="l">Cycle End</span>
                <input
                  className="input"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
              <label className="fld">
                <span className="l">Total Payroll Days (live)</span>
                <input
                  className="input mono"
                  type="number"
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value, 10) || 30)}
                />
              </label>
            </div>
            <div className="row-flex" style={{ justifyContent: "space-between" }}>
              <span className="muted" style={{ fontSize: 12 }}>
                Changing payroll days recalculates everyone&apos;s daily rate & salary.
              </span>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!can("configure")}
                onClick={() => void saveCycle()}
              >
                Save Cycle
              </button>
            </div>
          </>
        ) : tab === "Overtime" ? (
          <>
            <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
              <strong>display</strong> = OT minutes on register only (no pay). <strong>paid</strong> = adds OT
              pay to net at hourly rate × multiplier.
            </div>
            <div className="grid g2" style={{ gap: "0 24px" }}>
              <label className="fld">
                <span className="l">Mode</span>
                <select
                  className="input"
                  value={String(policyDraft.mode ?? overtimePolicy?.config?.mode ?? "display")}
                  onChange={(e) => setPolicyDraft((prev) => ({ ...prev, mode: e.target.value }))}
                >
                  <option value="display">display (no pay)</option>
                  <option value="paid">paid (add to net)</option>
                </select>
              </label>
              <Fld
                label="Rate multiplier"
                value={String(
                  policyDraft.rate_multiplier ?? overtimePolicy?.config?.rate_multiplier ?? "1.5",
                )}
                onChange={(v) => setPolicyDraft((prev) => ({ ...prev, rate_multiplier: v }))}
              />
              <Fld
                label="Hours per day (hourly basis)"
                value={String(
                  policyDraft.hours_per_day ?? overtimePolicy?.config?.hours_per_day ?? "8",
                )}
                onChange={(v) => setPolicyDraft((prev) => ({ ...prev, hours_per_day: v }))}
              />
              <Fld
                label="Minimum OT minutes to pay"
                value={String(
                  policyDraft.min_ot_minutes ?? overtimePolicy?.config?.min_ot_minutes ?? "30",
                )}
                onChange={(v) => setPolicyDraft((prev) => ({ ...prev, min_ot_minutes: v }))}
              />
            </div>
            <div className="row-flex" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!can("configure")}
                onClick={() => void saveOvertime()}
              >
                Save Overtime Policy
              </button>
            </div>
          </>
        ) : tab === "Canada Deductions" ? (
          <>
            <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
              Applies when employee <strong>payroll country = CA</strong>. Register columns map as CPP
              (pf), EI (esic), Tax+Other (pt).
            </div>
            <div className="grid g2" style={{ gap: "0 24px" }}>
              <Fld
                label="CPP rate (employee)"
                value={String(policyDraft.cpp_rate ?? canadaPolicy?.config?.cpp_rate ?? "0.0595")}
                onChange={(v) => setPolicyDraft((prev) => ({ ...prev, cpp_rate: v }))}
              />
              <Fld
                label="EI rate (employee)"
                value={String(policyDraft.ei_rate ?? canadaPolicy?.config?.ei_rate ?? "0.0166")}
                onChange={(v) => setPolicyDraft((prev) => ({ ...prev, ei_rate: v }))}
              />
              <Fld
                label="Flat income tax rate (when TDS applicable)"
                value={String(
                  policyDraft.income_tax_flat ?? canadaPolicy?.config?.income_tax_flat ?? "0",
                )}
                onChange={(v) => setPolicyDraft((prev) => ({ ...prev, income_tax_flat: v }))}
              />
              <Fld
                label="Other deductions (fixed per cycle)"
                value={String(
                  policyDraft.other_deductions ?? canadaPolicy?.config?.other_deductions ?? "0",
                )}
                onChange={(v) => setPolicyDraft((prev) => ({ ...prev, other_deductions: v }))}
              />
            </div>
            <div className="row-flex" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!can("configure")}
                onClick={() => void saveCanada()}
              >
                Save Canada Policy
              </button>
            </div>
          </>
        ) : tab === "Workflow" ? (
          <>
            <div className="grid g2" style={{ gap: "0 24px" }}>
              <Fld
                label="Chain enabled"
                value={String(policyDraft.enabled ?? workflowPolicy?.config?.enabled ?? "true")}
                onChange={(v) => setPolicyDraft((prev) => ({ ...prev, enabled: v }))}
              />
              <Fld
                label="Approval chain (comma-separated)"
                value={String(
                  policyDraft.chain ??
                    (Array.isArray(workflowPolicy?.config?.chain)
                      ? (workflowPolicy!.config.chain as string[]).join(",")
                      : "Manager,HR"),
                )}
                onChange={(v) => setPolicyDraft((prev) => ({ ...prev, chain: v }))}
              />
              <Fld
                label="Skip manager when no reporting manager"
                value={String(
                  policyDraft.skip_manager_when_no_mgr ??
                    workflowPolicy?.config?.skip_manager_when_no_mgr ??
                    "true",
                )}
                onChange={(v) =>
                  setPolicyDraft((prev) => ({ ...prev, skip_manager_when_no_mgr: v }))
                }
              />
            </div>
            <div className="row-flex" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!can("configure")}
                onClick={() => void saveWorkflow()}
              >
                Save Workflow
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="grid g2" style={{ gap: "0 24px" }}>
              {configFields.map((f) => (
                <Fld
                  key={f.key}
                  label={f.label}
                  value={f.value}
                  onChange={(v) => setPolicyDraft((prev) => ({ ...prev, [f.key]: v }))}
                />
              ))}
            </div>
            <div className="row-flex" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              {tab === "Leave" && (
                <button
                  type="button"
                  className="btn"
                  disabled={!can("configure")}
                  onClick={() => void runAccrual()}
                >
                  Run monthly accrual
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                disabled={!can("configure")}
                onClick={() => void savePolicy()}
              >
                Save Changes
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
