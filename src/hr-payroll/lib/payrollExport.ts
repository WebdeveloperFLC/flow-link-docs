import { salarySlipHtml } from "./salarySlip";
import { formatMoney } from "./format";
import type { EmployeeRow, PayrollCycleRow, PayrollLineRow } from "./types";

export type PayrollRegisterRow = {
  emp_code: string;
  full_name: string;
  designation: string | null;
  department: string | null;
  company_name: string | null;
  branch_name: string | null;
  cycle_label: string;
  cycle_status: string;
  currency?: string;
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
  pt_employee?: number;
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
  "PT",
  "Net",
  "Locked",
] as const;

/** Columns before Gross (Employee … Daily). */
export const REGISTER_GROSS_COL_INDEX = 18;

/** Escape CSV/TSV cell values for Excel. */
export function csvEscapeCell(v: string | number): string {
  const s = String(v);
  if (/[",\n\r\t]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

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
    r.pt_employee ?? 0,
    r.net_salary,
    r.cycle_status === "Locked" || r.cycle_status === "Paid" ? "Yes" : "No",
  ];
}

/** Merge server export rows with client PT (and currency) from payroll lines. */
export function mergeRegisterExportWithClientPt(
  serverRows: PayrollRegisterRow[],
  clientRows: PayrollRegisterRow[],
): PayrollRegisterRow[] {
  const byCode = new Map(clientRows.map((r) => [r.emp_code, r]));
  return serverRows.map((row) => {
    const client = byCode.get(row.emp_code);
    if (!client) return row;
    return {
      ...row,
      pt_employee: client.pt_employee ?? row.pt_employee ?? 0,
      currency: client.currency ?? row.currency,
    };
  });
}

export function registerTotalsByCurrency(
  rows: PayrollRegisterRow[],
): Record<string, { gross: number; net: number }> {
  const acc: Record<string, { gross: number; net: number }> = {};
  for (const r of rows) {
    const cur = r.currency ?? "INR";
    if (!acc[cur]) acc[cur] = { gross: 0, net: 0 };
    acc[cur].gross += r.gross_earned;
    acc[cur].net += r.net_salary;
  }
  return acc;
}

export function downloadPayrollRegister(
  rows: PayrollRegisterRow[],
  cycleLabel: string,
  fmt: "CSV" | "Excel",
) {
  const sep = fmt === "CSV" ? "," : "\t";
  const bom = fmt === "CSV" ? "\uFEFF" : "";
  const csv = [
    HEADERS.join(sep),
    ...rows.map((r) => rowValues(r).map(csvEscapeCell).join(sep)),
  ].join("\n");
  const blob = new Blob([bom + csv], {
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
      payroll_country?: string;
      salary_currency?: string;
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
    pt_employee?: number;
    net_salary: number;
    is_overridden: boolean;
  }>,
  cycleLabel: string,
  cycleStatus: string,
): PayrollRegisterRow[] {
  return lines.map((r) => {
    const emp = r.employees;
    const currency =
      emp?.salary_currency ??
      (emp?.payroll_country === "CA" ? "CAD" : "INR");
    return {
      emp_code: emp?.emp_code ?? "",
      full_name: emp?.full_name ?? "",
      designation: null,
      department: null,
      company_name: emp?.companies?.name ?? null,
      branch_name: emp?.branches?.name ?? null,
      cycle_label: cycleLabel,
      cycle_status: cycleStatus,
      currency,
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
      pt_employee: r.pt_employee ?? 0,
      net_salary: r.net_salary,
      is_overridden: r.is_overridden,
    };
  });
}

export function registerPdfFooterHtml(rows: PayrollRegisterRow[]): string {
  const totals = registerTotalsByCurrency(rows);
  return Object.entries(totals)
    .map(
      ([cur, t]) =>
        `<tr><td colspan="${REGISTER_GROSS_COL_INDEX}" style="text-align:right">Totals (${cur})</td>` +
        `<td>${formatMoney(t.gross, cur)}</td>` +
        `<td colspan="5"></td>` +
        `<td>${formatMoney(t.net, cur)}</td><td></td></tr>`,
    )
    .join("");
}

export function registerPdfHtml(rows: PayrollRegisterRow[], cycleLabel: string, locked: boolean) {
  const th = HEADERS.map((h) => `<th>${h}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${rowValues(r)
          .map((v) => `<td>${v}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const footer = registerPdfFooterHtml(rows);
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
<tfoot>${footer}</tfoot>
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
    emp: EmployeeRow;
    line: PayrollLineRow;
    cycle?: { label: string; payroll_days: number; start_date: string; end_date: string };
  }>,
  cycleLabel: string,
) {
  const w = window.open("", "_blank");
  if (!w) return;
  const pages = items
    .map(({ emp, line, cycle }) => {
      const c = cycle ?? {
        label: cycleLabel,
        payroll_days: line.payroll_days,
        start_date: "",
        end_date: "",
      };
      const body = salarySlipHtml(emp, line, c as PayrollCycleRow);
      return body.replace(/<\/?html[^>]*>|<\/?head[^>]*>|<\/?body[^>]*>/gi, "").trim();
    })
    .map((inner) => `<div class="page">${inner}</div>`)
    .join("");
  w.document.write(`<!DOCTYPE html><html><head><title>Salary Slips — ${cycleLabel}</title>
<style>
body{font-family:system-ui,sans-serif;color:#1a2233;margin:0}
.page{padding:32px;page-break-after:always}
.page:last-child{page-break-after:auto}
</style></head><body>${pages}</body></html>`);
  w.document.close();
  w.print();
}
