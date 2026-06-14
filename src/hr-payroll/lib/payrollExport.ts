export type PayrollRegisterRow = {
  emp_code: string;
  full_name: string;
  designation: string | null;
  department: string | null;
  company_name: string | null;
  branch_name: string | null;
  cycle_label: string;
  cycle_status: string;
  mispunch_count: number;
  late_count: number;
  leaves_taken: number;
  paid_leaves: number;
  comp_off: number;
  ul_count: number;
  sandwich_count: number;
  unpaid_training: number;
  ot_minutes?: number;
  ot_pay?: number;
  late_deduction: number;
  mispunch_deduction: number;
  payable_days: number;
  daily_rate: number;
  gross_earned: number;
  incentive: number;
  bonus: number;
  pf_employee: number;
  esic_employee: number;
  net_salary: number;
  is_overridden: boolean;
};

const HEADERS = [
  "Employee",
  "Code",
  "Branch",
  "Company",
  "MisAbs",
  "Late",
  "Leaves",
  "PaidLv",
  "CompOff",
  "UL",
  "Sandwich",
  "Train",
  "OT min",
  "OT pay",
  "LateDed",
  "MisDed",
  "Payable",
  "Daily",
  "Gross",
  "Incentive",
  "Bonus",
  "PF",
  "ESIC",
  "Net",
  "Locked",
] as const;

function rowValues(r: PayrollRegisterRow): (string | number)[] {
  return [
    r.full_name,
    r.emp_code,
    r.branch_name ?? "",
    r.company_name ?? "",
    r.mispunch_count,
    r.late_count,
    r.leaves_taken,
    r.paid_leaves,
    r.comp_off,
    r.ul_count,
    r.sandwich_count,
    r.unpaid_training,
    r.ot_minutes ?? 0,
    r.ot_pay ?? 0,
    r.late_deduction,
    r.mispunch_deduction,
    r.payable_days,
    r.daily_rate,
    r.gross_earned,
    r.incentive,
    r.bonus,
    r.pf_employee,
    r.esic_employee,
    r.net_salary,
    r.cycle_status === "Locked" ? "Yes" : "No",
  ];
}

export function downloadPayrollRegister(
  rows: PayrollRegisterRow[],
  cycleLabel: string,
  fmt: "CSV" | "Excel",
) {
  const sep = fmt === "CSV" ? "," : "\t";
  const csv = [
    HEADERS.join(sep),
    ...rows.map((r) => rowValues(r).join(sep)),
  ].join("\n");
  const blob = new Blob([csv], {
    type: fmt === "CSV" ? "text/csv;charset=utf-8" : "application/vnd.ms-excel",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `salary_register_${cycleLabel.replace(/\s+/g, "_")}.${fmt === "CSV" ? "csv" : "xls"}`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function linesToRegisterRows(
  lines: Array<{
    employees?: {
      full_name?: string;
      emp_code?: string;
      branches?: { name?: string } | null;
      companies?: { name?: string } | null;
    } | null;
    mispunch_count: number;
    late_count: number;
    leaves_taken: number;
    paid_leaves: number;
    comp_off: number;
    ul_count: number;
    sandwich_count: number;
    unpaid_training: number;
    ot_minutes?: number;
    ot_pay?: number;
    late_deduction: number;
    mispunch_deduction: number;
    payable_days: number;
    daily_rate: number;
    gross_earned: number;
    incentive: number;
    bonus: number;
    pf_employee: number;
    esic_employee: number;
    net_salary: number;
    is_overridden: boolean;
  }>,
  cycleLabel: string,
  cycleStatus: string,
): PayrollRegisterRow[] {
  return lines.map((r) => ({
    emp_code: r.employees?.emp_code ?? "",
    full_name: r.employees?.full_name ?? "",
    designation: null,
    department: null,
    company_name: r.employees?.companies?.name ?? null,
    branch_name: r.employees?.branches?.name ?? null,
    cycle_label: cycleLabel,
    cycle_status: cycleStatus,
    mispunch_count: r.mispunch_count,
    late_count: r.late_count,
    leaves_taken: r.leaves_taken,
    paid_leaves: r.paid_leaves,
    comp_off: r.comp_off,
    ul_count: r.ul_count,
    sandwich_count: r.sandwich_count,
    unpaid_training: r.unpaid_training,
    ot_minutes: r.ot_minutes ?? 0,
    ot_pay: r.ot_pay ?? 0,
    late_deduction: r.late_deduction,
    mispunch_deduction: r.mispunch_deduction,
    payable_days: r.payable_days,
    daily_rate: r.daily_rate,
    gross_earned: r.gross_earned,
    incentive: r.incentive,
    bonus: r.bonus,
    pf_employee: r.pf_employee,
    esic_employee: r.esic_employee,
    net_salary: r.net_salary,
    is_overridden: r.is_overridden,
  }));
}

function fmtInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function registerPdfHtml(rows: PayrollRegisterRow[], cycleLabel: string, locked: boolean) {
  const totG = rows.reduce((s, r) => s + r.gross_earned, 0);
  const totN = rows.reduce((s, r) => s + r.net_salary, 0);
  const th = HEADERS.map((h) => `<th>${h}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${rowValues(r)
          .map((v) => `<td>${v}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><title>Salary Register — ${cycleLabel}</title>
<style>
body{font-family:system-ui,sans-serif;padding:24px;color:#1a2233;font-size:11px}
h1{font-size:18px;margin:0}h2{font-size:12px;color:#666;font-weight:500;margin:4px 0 16px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #dde3ef;padding:5px 6px;text-align:right}
th:first-child,td:first-child{text-align:left}
th{background:#f6f8fc;font-weight:600}
tfoot td{font-weight:700;border-top:2px solid #1a2233}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;background:#e8f5e9;color:#2e7d32;font-size:10px;margin-left:8px}
</style></head><body>
<h1>Future Link Consultants</h1>
<h2>Salary Register · ${cycleLabel}${locked ? '<span class="badge">LOCKED</span>' : ""}</h2>
<table><thead><tr>${th}</tr></thead><tbody>${body}</tbody>
<tfoot><tr><td colspan="15" style="text-align:right">Totals</td>
<td>${fmtInr(totG)}</td><td colspan="4"></td><td>${fmtInr(totN)}</td><td></td></tr></tfoot>
</table></body></html>`;
}

export function printRegisterPdf(rows: PayrollRegisterRow[], cycleLabel: string, locked: boolean) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(registerPdfHtml(rows, cycleLabel, locked));
  w.document.close();
  w.print();
}

export function printBatchSalarySlips(
  items: Array<{
    emp: { full_name: string; emp_code: string; department?: string | null; branches?: { name?: string } | null };
    line: {
      payroll_days: number;
      payable_days: number;
      daily_rate: number;
      gross_earned: number;
      incentive: number;
      bonus: number;
      ot_pay?: number;
      pf_employee: number;
      esic_employee: number;
      net_salary: number;
    };
  }>,
  cycleLabel: string,
) {
  const w = window.open("", "_blank");
  if (!w) return;
  const pages = items
    .map(({ emp, line }) => {
      const rows = [
        ["Employee", `${emp.full_name} (${emp.emp_code})`],
        ["Department", emp.department ?? "—"],
        ["Branch", emp.branches?.name ?? "—"],
        ["Cycle", cycleLabel],
        ["Payroll Days", String(line.payroll_days)],
        ["Payable Days", String(line.payable_days)],
        ["Daily Rate", fmtInr(line.daily_rate)],
        ["Gross Earned", fmtInr(line.gross_earned)],
        ["Incentive", fmtInr(line.incentive)],
        ["Bonus", fmtInr(line.bonus)],
        ...(line.ot_pay ? [["OT Pay", fmtInr(line.ot_pay)]] : []),
        ["PF (Employee)", fmtInr(line.pf_employee)],
        ["ESIC (Employee)", fmtInr(line.esic_employee)],
        ["Net Salary", fmtInr(line.net_salary)],
      ];
      return `<div class="page"><h1>Future Link Consultants</h1><h2>Salary Slip · ${cycleLabel}</h2>
<table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</table></div>`;
    })
    .join("");
  w.document.write(`<!DOCTYPE html><html><head><title>Salary Slips — ${cycleLabel}</title>
<style>
body{font-family:system-ui,sans-serif;color:#1a2233;margin:0}
.page{padding:32px;page-break-after:always}
.page:last-child{page-break-after:auto}
h1{font-size:20px;margin:0 0 4px}h2{font-size:13px;color:#666;font-weight:500;margin:0 0 24px}
table{border-collapse:collapse;width:100%;max-width:480px}
td{padding:8px 0;border-bottom:1px solid #eef0f5;font-size:13px}
td:first-child{color:#666;width:45%}td:last-child{text-align:right;font-weight:500}
tr:last-child td{border-bottom:2px solid #1a2233;font-weight:700;font-size:15px}
</style></head><body>${pages}</body></html>`);
  w.document.close();
  w.print();
}
