import type { EmployeeRow, PayrollLineRow, PayrollCycleRow } from "../lib/types";
import { inr } from "./format";

export function printSalarySlip(
  emp: EmployeeRow,
  line: PayrollLineRow,
  cycle: PayrollCycleRow,
) {
  const w = window.open("", "_blank");
  if (!w) return;
  const rows = [
    ["Employee", `${emp.full_name} (${emp.emp_code})`],
    ["Department", emp.department ?? "—"],
    ["Branch", emp.branches?.name ?? "—"],
    ["Cycle", cycle.label],
    ["Payroll Days", String(line.payroll_days)],
    ["Payable Days", String(line.payable_days)],
    ["Daily Rate", inr(line.daily_rate)],
    ["Gross Earned", inr(line.gross_earned)],
    ["Incentive", inr(line.incentive)],
    ["Bonus", inr(line.bonus)],
    ["PF (Employee)", inr(line.pf_employee)],
    ["ESIC (Employee)", inr(line.esic_employee)],
    ["Net Salary", inr(line.net_salary)],
  ];
  w.document.write(`
    <!DOCTYPE html><html><head><title>Salary Slip — ${emp.full_name}</title>
    <style>body{font-family:system-ui,sans-serif;padding:32px;color:#1a2233}
    h1{font-size:20px;margin:0 0 4px}h2{font-size:13px;color:#666;font-weight:500;margin:0 0 24px}
    table{border-collapse:collapse;width:100%;max-width:480px}
    td{padding:8px 0;border-bottom:1px solid #eef0f5;font-size:13px}
    td:first-child{color:#666;width:45%}td:last-child{text-align:right;font-weight:500}
    tr:last-child td{border-bottom:2px solid #1a2233;font-weight:700;font-size:15px}</style></head>
    <body><h1>Future Link Consultants</h1><h2>Salary Slip · ${cycle.label}</h2>
    <table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</table>
    </body></html>`);
  w.document.close();
  w.print();
}
