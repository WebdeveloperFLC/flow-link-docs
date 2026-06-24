import type { EmployeeRow, PayrollCycleRow, PayrollLineRow } from "./types";
import { buildPayableDaysBreakdown, buildStatutoryBreakdown } from "./payrollBreakdown";
import { structureFromPayrollLine } from "./payrollLineStructure";
import { employeeCurrency, formatMoney } from "./format";

export { isPayrollSlipCycle } from "./payrollSlipPolicy";

export function salarySlipHtml(
  emp: EmployeeRow,
  line: PayrollLineRow,
  cycle: PayrollCycleRow,
): string {
  const currency = employeeCurrency(emp);
  const isCanada = currency === "CAD" || emp.payroll_country === "CA";
  const money = (n: number) => formatMoney(n, currency);
  const payable = buildPayableDaysBreakdown(line, cycle, line.input_snapshot ?? null);
  const stat = buildStatutoryBreakdown(line, emp);
  const structure = structureFromPayrollLine(line);

  const attendanceRows = [
    ["Present days", String(payable.presentDays)],
    ["Weekly offs", String(payable.weeklyOffs)],
    ["Holidays", String(payable.holidays)],
    ["Approved paid leaves", String(payable.approvedPaidLeaves)],
    ["Approved comp-offs", String(payable.approvedCompOffs)],
    ["Late deduction (days)", String(payable.lateComingDeductions)],
    ["Mispunch deduction (days)", String(payable.mispunchDeductions)],
    ["Sandwich leave (days)", String(payable.sandwichLeaveDeductions)],
    ["Unapproved leave (days)", String(payable.unapprovedLeaveDeductionDays)],
  ];

  const metaRows = [
    ["Employee", `${emp.full_name} (${emp.emp_code})`],
    ["Department", emp.department ?? "—"],
    ["Branch", emp.branches?.name ?? "—"],
    ["Cycle", cycle.label],
    ["Payroll days", String(line.payroll_days)],
    ["Payable days", String(line.payable_days)],
    ["Daily rate", money(line.daily_rate)],
  ];

  const earningsRows = isCanada
    ? [
        ["Gross earned", money(line.gross_earned)],
        ["Incentive", money(line.incentive)],
        ["Bonus", money(line.bonus)],
        ...(line.ot_pay && line.ot_pay > 0 ? [["OT pay", money(line.ot_pay)]] as const : []),
      ]
    : structure
    ? [
        ["Basic", money(structure.basic)],
        ["HRA", money(structure.hra)],
        ["Conveyance", money(structure.conveyance)],
        ["Bonus", money(structure.bonusAmount)],
        ["Other Allowances", money(structure.otherAllowances)],
        ["Total Earnings", money(structure.totalEarningsA)],
        ...(line.incentive > 0 ? [["Incentive", money(line.incentive)]] as const : []),
        ...(line.bonus > 0 ? [["Cycle Bonus", money(line.bonus)]] as const : []),
        ...(line.ot_pay && line.ot_pay > 0 ? [["OT pay", money(line.ot_pay)]] as const : []),
      ]
    : [
        ["Gross earned", money(line.gross_earned)],
        ["Incentive", money(line.incentive)],
        ["Bonus", money(line.bonus)],
        ...(line.ot_pay && line.ot_pay > 0 ? [["OT pay", money(line.ot_pay)]] as const : []),
      ];

  const deductionRows = isCanada
    ? [
        ["CPP (employee)", money(line.pf_employee)],
        ["EI (employee)", money(line.esic_employee)],
        ...((line.pt_employee ?? 0) > 0 ? [["Income tax", money(line.pt_employee!)] as const] : []),
        ...(stat.otherDeductions > 0
          ? [["Other deductions", money(stat.otherDeductions)] as const]
          : []),
      ]
    : [
        ["Employee PF", money(line.pf_employee)],
        ["Employee ESIC", money(line.esic_employee)],
        ...(stat.ptEmployee > 0
          ? [["Professional Tax", money(stat.ptEmployee)] as const]
          : []),
        ...(stat.tdsLine > 0 ? [["TDS", money(stat.tdsLine)] as const] : []),
        ...(stat.otherDeductions > 0
          ? [["Other deductions", money(stat.otherDeductions)] as const]
          : []),
      ];

  const attTable = attendanceRows
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
    .join("");
  const metaTable = metaRows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("");
  const earnTable = earningsRows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("");
  const dedTable = deductionRows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("");

  return `<!DOCTYPE html><html><head><title>Salary Slip — ${emp.full_name}</title>
<style>
body{font-family:system-ui,sans-serif;padding:32px;color:#1a2233}
h1{font-size:20px;margin:0 0 4px}h2{font-size:13px;color:#666;font-weight:500;margin:0 0 8px}
h3{font-size:12px;color:#444;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.04em}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:720px}
table{border-collapse:collapse;width:100%}
td{padding:8px 0;border-bottom:1px solid #eef0f5;font-size:13px}
td:first-child{color:#666;width:55%}td:last-child{text-align:right;font-weight:500}
.pay-table tr:last-child td{border-bottom:2px solid #1a2233;font-weight:700;font-size:15px}
@media print{.grid{grid-template-columns:1fr 1fr}}
</style></head>
<body>
<h1>Future Link Consultants</h1>
<h2>Salary Slip · ${cycle.label}</h2>
<div class="grid">
  <div><h3>Attendance & payable days</h3><table>${attTable}</table></div>
  <div><h3>Pay summary</h3><table>${metaTable}</table></div>
</div>
<h3>Earnings</h3>
<table>${earnTable}</table>
<h3>Deductions</h3>
<table>${dedTable}</table>
<table class="pay-table"><tr><td>Net Salary</td><td>${money(line.net_salary)}</td></tr></table>
</body></html>`;
}

export function printSalarySlip(
  emp: EmployeeRow,
  line: PayrollLineRow,
  cycle: PayrollCycleRow,
) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(salarySlipHtml(emp, line, cycle));
  w.document.close();
  w.print();
}
