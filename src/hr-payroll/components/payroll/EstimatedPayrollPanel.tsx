import { fmtDur } from "../../lib/attendanceMetrics";
import type { EstimatedPayrollResult, PayBasis } from "../../lib/estimatedPayrollCalculator";
import { formatMoney } from "../../lib/format";

type Props = {
  estimate: EstimatedPayrollResult;
  currency?: string;
  compact?: boolean;
};

const PAY_BASIS_HINT: Record<PayBasis, string> = {
  Monthly: "Present days × daily rate",
  Daily: "Present days × daily wage",
  Hourly: "Present hours × hourly rate",
};

export function EstimatedPayrollPanel({ estimate, currency = "INR", compact }: Props) {
  const money = (n: number) => formatMoney(n, currency);
  const d = estimate.deductions;
  const isCanada = d.isCanada;

  const attendanceRows = [
    ["Worked days", String(estimate.workedDays)],
    ["Working hours", `${estimate.workedHours.toFixed(1)}h`],
    ["Paid leave", String(estimate.paidLeaveDays)],
    ["Unpaid leave", String(estimate.unpaidLeaveDays)],
  ] as const;

  const deductionRows = isCanada
    ? ([
        ["CPP (estimated)", money(d.pf)],
        ["EI (estimated)", money(d.esic)],
        ["Income tax (placeholder)", "Not calculated — final at payroll lock"],
      ] as const)
    : ([
        ["PF (estimated)", money(d.pf)],
        ["ESIC (estimated)", money(d.esic)],
        ["Professional tax (estimated)", money(d.professionalTax)],
        ["Income tax (placeholder)", "Not calculated — final at payroll lock"],
      ] as const);

  return (
    <div className={`card ${compact ? "" : "ess-estimate-card"}`}>
      <div className="card-h">
        <h3>Estimated payroll</h3>
        <span className="tag">Validation only</span>
      </div>
      {!compact && (
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 12, lineHeight: 1.5 }}>
          {estimate.cycleLabel} · Pay basis: <strong>{estimate.payBasis}</strong> (
          {PAY_BASIS_HINT[estimate.payBasis]}) · {estimate.workingDays} working days · daily{" "}
          {money(estimate.dailyRate)} · hourly {money(estimate.hourlyRate)}.
        </p>
      )}

      <div className="ess-estimate-section">
        <div className="ess-estimate-section-title">Attendance</div>
        <div className="ess-estimate-grid">
          {attendanceRows.map(([label, val]) => (
            <div key={label} className="ess-estimate-row">
              <span className="ess-estimate-label">{label}</span>
              <span className="ess-estimate-val">{val}</span>
            </div>
          ))}
          <div className="ess-estimate-row">
            <span className="ess-estimate-label">Overtime</span>
            <span className="ess-estimate-val">
              {fmtDur(estimate.otMinutes)}
              {estimate.otDisplayOnly
                ? " (hours only)"
                : estimate.otPay != null
                  ? ` · ${money(estimate.otPay)}`
                  : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="ess-estimate-section">
        <div className="ess-estimate-section-title">Gross</div>
        <div className="ess-estimate-grid">
          <div className="ess-estimate-row">
            <span className="ess-estimate-label">Estimated earnings</span>
            <span className="ess-estimate-val">{money(estimate.estimatedEarnings)}</span>
          </div>
          <div className="ess-estimate-row ess-estimate-row--gross">
            <span className="ess-estimate-label">Estimated gross</span>
            <span className="ess-estimate-val">{money(estimate.estimatedGross)}</span>
          </div>
        </div>
      </div>

      <div className="ess-estimate-section">
        <div className="ess-estimate-section-title">Estimated deductions</div>
        <div className="ess-estimate-grid">
          {deductionRows.map(([label, val]) => (
            <div key={label} className="ess-estimate-row ess-estimate-row--deduct">
              <span className="ess-estimate-label">{label}</span>
              <span className="ess-estimate-val">{val}</span>
            </div>
          ))}
          <div className="ess-estimate-row ess-estimate-row--deduct">
            <span className="ess-estimate-label">Total estimated deductions</span>
            <span className="ess-estimate-val">{money(d.total)}</span>
          </div>
        </div>
      </div>

      <div className="ess-estimate-net">
        <span className="ess-estimate-net-label">Estimated net</span>
        <span className="ess-estimate-net-val">{money(d.estimatedNet)}</span>
      </div>

      <p className="ess-estimate-disclaimer">
        Estimated earnings and deductions only — not final payroll. Amounts are subject to HR
        approval at payroll lock.
      </p>
    </div>
  );
}
