import { useEffect, useMemo, useState } from "react";
import { useHrPolicies } from "../hooks/useHrRequests";
import { rpcComputePayroll } from "../hooks/useHrPayroll";
import { inr } from "../lib/format";
import {
  lateSlabDisplayRows,
  resolveLateSlabTable,
} from "../lib/leavePolicy";

type Inputs = {
  payrollDays: number;
  monthly: number;
  basic: number;
  incentive: number;
  bonus: number;
  pfApplicable: boolean;
  esicApplicable: boolean;
  leaves: number;
  paidLeaves: number;
  late: number;
  ul: number;
  sandwich: number;
  mispunch: number;
  compoff: number;
  trainingUnpaid: number;
};

type ComputeOut = {
  late_deduction: number;
  mispunch_deduction: number;
  payable_days: number;
  daily_rate: number;
  gross_earned: number;
  pf_employee: number;
  esic_employee: number;
  net_salary: number;
};

export default function HrCalculatorPage() {
  const { data: policies = [] } = useHrPolicies();
  const latePolicy = useMemo(
    () =>
      [...policies]
        .filter((p) => p.domain === "late")
        .sort((a, b) => b.version - a.version)[0],
    [policies],
  );

  const { resolvedLatePolicy, slabWarn } = useMemo(() => {
    const warnings: string[] = [];
    const slab_table = resolveLateSlabTable(latePolicy?.config, (msg) => warnings.push(msg));
    return {
      resolvedLatePolicy: { ...(latePolicy?.config ?? {}), slab_table },
      slabWarn: warnings[0] ?? null,
    };
  }, [latePolicy]);

  const [inputs, setInputs] = useState<Inputs>({
    payrollDays: 30,
    monthly: 42000,
    basic: 21000,
    incentive: 0,
    bonus: 0,
    pfApplicable: true,
    esicApplicable: false,
    leaves: 0,
    paidLeaves: 0,
    late: 4,
    ul: 0,
    sandwich: 0,
    mispunch: 3,
    compoff: 1,
    trainingUnpaid: 0,
  });
  const [out, setOut] = useState<ComputeOut | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = (await rpcComputePayroll({
          p_payroll_days: inputs.payrollDays,
          p_monthly: inputs.monthly,
          p_basic: inputs.basic,
          p_incentive: inputs.incentive,
          p_bonus: inputs.bonus,
          p_pf_applicable: inputs.pfApplicable,
          p_esic_applicable: inputs.esicApplicable,
          p_leaves: inputs.leaves,
          p_paid_leaves: inputs.paidLeaves,
          p_late: inputs.late,
          p_ul: inputs.ul,
          p_sandwich: inputs.sandwich,
          p_mispunch: inputs.mispunch,
          p_compoff: inputs.compoff,
          p_unpaid_training: inputs.trainingUnpaid,
          p_late_policy: resolvedLatePolicy,
        })) as ComputeOut;
        if (!cancelled) {
          setOut(data);
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Compute failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inputs, resolvedLatePolicy]);

  const setNum = (k: keyof Inputs, v: string) => {
    setInputs((prev) => ({ ...prev, [k]: v === "" ? 0 : parseFloat(v) }));
  };

  const slabRows = useMemo(
    () => lateSlabDisplayRows(inputs.late, resolvedLatePolicy),
    [inputs.late, resolvedLatePolicy],
  );

  const NumRow = ({
    k,
    label,
    hint,
  }: {
    k: keyof Inputs;
    label: string;
    hint?: string;
  }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 0",
        borderBottom: "1px solid #eef0f5",
      }}
    >
      <div>
        <div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 11.5, color: "var(--mut)" }}>{hint}</div>}
      </div>
      <input
        className="calc-input"
        type="number"
        step="0.5"
        value={inputs[k] as number}
        onChange={(e) => setNum(k, e.target.value)}
      />
    </div>
  );

  const K = out?.late_deduction ?? 0;
  const N = out?.mispunch_deduction ?? 0;
  const payable = out?.payable_days ?? 0;
  const daily = out?.daily_rate ?? 0;
  const gross = out?.gross_earned ?? 0;
  const pf = out?.pf_employee ?? 0;
  const esic = out?.esic_employee ?? 0;
  const net = out?.net_salary ?? 0;

  return (
    <div className="grid g2" style={{ gap: 16, alignItems: "start" }}>
      <div className="page-grid">
        <div className="card">
          <div className="card-h">
            <h3>Inputs — live</h3>
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
            <label className="fld" style={{ flex: 1, marginBottom: 0 }}>
              <span className="l">Payroll Days</span>
              <input
                className="input mono"
                type="number"
                value={inputs.payrollDays}
                onChange={(e) => setNum("payrollDays", e.target.value)}
              />
            </label>
            <label className="fld" style={{ flex: 1, marginBottom: 0 }}>
              <span className="l">Monthly Salary</span>
              <input
                className="input mono"
                type="number"
                value={inputs.monthly}
                onChange={(e) => setNum("monthly", e.target.value)}
              />
            </label>
          </div>
          <div className="divider" style={{ margin: "10px 0" }} />
          <NumRow k="leaves" label="Leaves Taken" hint="reduces payable" />
          <NumRow k="paidLeaves" label="Paid Leave Days" hint="added back" />
          <NumRow k="compoff" label="Approved Comp-Off" hint="added" />
          <NumRow k="late" label="Late Comings" hint="feeds slab" />
          <NumRow k="mispunch" label="Mispunch + Absent" hint="first 2 free, 0.5 each" />
          <NumRow k="ul" label="Unauthorized Leave" hint="×2" />
          <NumRow k="sandwich" label="Sandwich Leave" hint="×1 incl off-day" />
          <NumRow k="trainingUnpaid" label="Unpaid Training Days" hint="deducted" />
          {err && <div className="errmsg">{err}</div>}
        </div>

        <div className="card">
          <div className="card-h" style={{ marginBottom: 8 }}>
            <h3 style={{ fontSize: 15 }}>Late slab</h3>
            <span className="tag">live</span>
          </div>
          {slabWarn && (
            <div className="muted" style={{ fontSize: 12, marginBottom: 8, color: "var(--amber)" }}>
              {slabWarn}
            </div>
          )}
          <table className="slabtable">
            <thead>
              <tr>
                <th>Late count</th>
                <th>Deduction</th>
              </tr>
            </thead>
            <tbody>
              {slabRows.map((s) => (
                <tr key={s.range} className={s.active ? "hl" : ""}>
                  <td>{s.range}</td>
                  <td>{s.deduction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid" style={{ gap: 16, position: "sticky", top: 76 }}>
        <div
          className="card"
          style={{
            background: "linear-gradient(160deg,#eef5ff,#e8efe6)",
            borderColor: "#cfe1f7",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: 0.7,
              textTransform: "uppercase",
              color: "var(--mut)",
              fontWeight: 600,
            }}
          >
            Final Payable Days
          </div>
          <div className="kpi-big" style={{ color: "var(--moss-deep)", margin: "8px 0 4px" }}>
            {payable}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            of {inputs.payrollDays} payroll days
          </div>
          <div className="divider" />
          <div className="grid g3" style={{ gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--mut)", fontWeight: 600 }}>
                Daily
              </div>
              <div className="serif" style={{ fontSize: 18, fontWeight: 600 }}>
                {inr(daily)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--mut)", fontWeight: 600 }}>
                Gross
              </div>
              <div className="serif" style={{ fontSize: 18, fontWeight: 600 }}>
                {inr(gross)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--mut)", fontWeight: 600 }}>
                Net
              </div>
              <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--moss-deep)" }}>
                {inr(net)}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h" style={{ marginBottom: 10 }}>
            <h3 style={{ fontSize: 15 }}>How it computed</h3>
          </div>
          <div className="formula-box">
            Payable = {inputs.payrollDays}
            <span className="neg"> − {inputs.leaves}</span> + {inputs.paidLeaves} + {inputs.compoff}
            <br />
            <span style={{ paddingLeft: 62 }} className="neg">
              − {K} (late) − {inputs.ul * 2} (UL)
            </span>
            <br />
            <span style={{ paddingLeft: 62 }} className="neg">
              − {inputs.sandwich} (sand) − {N} (mis) − {inputs.trainingUnpaid} (train)
            </span>
            <br />
            <span
              style={{
                borderTop: "1px solid #3a4a42",
                display: "block",
                marginTop: 6,
                paddingTop: 6,
              }}
            >
              = <span className="res">{payable} days</span>
            </span>
            <br />
            Gross = {inr(daily)} × {payable} = <span className="res">{inr(gross)}</span>
            <br />
            Net = Gross + inc/bonus − PF({inr(pf)}) − ESIC({inr(esic)}) ={" "}
            <span className="res">{inr(net)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
