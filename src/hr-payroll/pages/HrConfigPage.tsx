import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrPolicies } from "../hooks/useHrRequests";
import { HR_ORG_ID } from "../lib/constants";
import { hrAudit } from "../lib/hrApi";
import type { PolicyRow } from "../lib/types";

const TABS = ["Payroll Cycle", "Late Coming", "Mispunch", "Leave", "Sandwich & UL"] as const;
type Tab = (typeof TABS)[number];

const DOMAIN_MAP: Record<Exclude<Tab, "Payroll Cycle">, string> = {
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

  const domain = tab !== "Payroll Cycle" ? DOMAIN_MAP[tab] : null;
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
            <div className="row-flex" style={{ justifyContent: "flex-end" }}>
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
