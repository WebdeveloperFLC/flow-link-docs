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
