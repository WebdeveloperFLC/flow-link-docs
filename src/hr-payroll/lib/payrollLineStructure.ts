import type { PayrollLineRow } from "./types";

/** Read persisted structure breakdown from payroll_lines — no client-side payroll math. */
export type PayrollLineStructureView = {
  salaryStructureMode: boolean;
  salaryPackage: number;
  basic: number;
  hra: number;
  conveyance: number;
  bonusAmount: number;
  otherAllowances: number;
  totalEarningsA: number;
  employerPf: number;
  employerEsic: number;
  totalEmployerCostB: number;
  structureDifference: number;
};

export function structureFromPayrollLine(line: PayrollLineRow): PayrollLineStructureView | null {
  if (!line.salary_structure_mode) return null;
  return {
    salaryStructureMode: true,
    salaryPackage: line.salary_package ?? 0,
    basic: line.structure_basic ?? 0,
    hra: line.structure_hra ?? 0,
    conveyance: line.structure_conveyance ?? 0,
    bonusAmount: line.structure_bonus ?? 0,
    otherAllowances: line.structure_other_allowances ?? 0,
    totalEarningsA: line.total_earnings_a ?? line.gross_earned,
    employerPf: line.employer_pf ?? 0,
    employerEsic: line.employer_esic ?? 0,
    totalEmployerCostB: line.total_employer_cost_b ?? 0,
    structureDifference: line.structure_difference ?? 0,
  };
}

export function structureStepsFromLine(
  line: PayrollLineRow,
  bonusPct?: number,
): { label: string; value: number; group: string }[] {
  const s = structureFromPayrollLine(line);
  if (!s) return [];
  const pct = bonusPct != null ? `${bonusPct}%` : "Bonus";
  return [
    { label: "Salary Package (CTC)", value: s.salaryPackage, group: "package" },
    { label: "Basic", value: s.basic, group: "earnings" },
    { label: "HRA", value: s.hra, group: "earnings" },
    { label: "Conveyance", value: s.conveyance, group: "earnings" },
    { label: `Bonus (${pct})`, value: s.bonusAmount, group: "earnings" },
    { label: "Other Allowances", value: s.otherAllowances, group: "earnings" },
    { label: "Earned Gross (from payable days)", value: s.totalEarningsA, group: "total" },
    { label: "Employer PF", value: s.employerPf, group: "employer" },
    { label: "Employer ESIC", value: s.employerEsic, group: "employer" },
    { label: "Total Employer Cost (B)", value: s.totalEmployerCostB, group: "employer" },
    { label: "Difference (CTC − A − B)", value: s.structureDifference, group: "diff" },
  ];
}
