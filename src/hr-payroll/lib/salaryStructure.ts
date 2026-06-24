import type { EmployeeRow, PayrollLineRow } from "./types";
import { buildStatutoryBreakdown } from "./payrollBreakdown";

export const PF_WAGE_CEILING = 15000;
export const ESIC_WAGE_CEILING = 21000;
export const DEFAULT_BONUS_PCT = 8.33;
export const DEFAULT_EMPLOYEE_PF_PCT = 12;
export const DEFAULT_EMPLOYER_PF_PCT = 12;
export const DEFAULT_EMPLOYEE_ESIC_PCT = 0.75;
export const DEFAULT_EMPLOYER_ESIC_PCT = 3.25;
export const DEFAULT_PT_AMOUNT = 200;

export type SalaryStructureInput = {
  salaryPackage?: number | null;
  monthlyGross?: number;
  basic: number;
  hra: number;
  conveyance: number;
  bonusPercentage?: number | null;
  otherAllowances?: number | null;
  pfApplicable?: boolean;
  esicApplicable?: boolean;
  employerPfApplicable?: boolean;
  employerEsicApplicable?: boolean;
  employeePfPct?: number | null;
  employerPfPct?: number | null;
  employeeEsicPct?: number | null;
  employerEsicPct?: number | null;
  professionalTaxAmount?: number | null;
  ptApplicable?: boolean;
  tdsApplicable?: boolean;
  otherDeductions?: number;
  payrollCountry?: string | null;
  salaryCurrency?: string | null;
};

export type SalaryStructureBreakdown = {
  salaryPackage: number;
  basic: number;
  hra: number;
  conveyance: number;
  bonusPercentage: number;
  bonusAmount: number;
  otherAllowances: number;
  totalEarningsA: number;
  employerPf: number;
  employerEsic: number;
  totalEmployerCostB: number;
  difference: number;
  employeePf: number;
  employeeEsic: number;
  professionalTax: number;
  tds: number;
  otherDeductions: number;
  netSalary: number;
  isCanada: boolean;
};

function round(n: number): number {
  return Math.round(n);
}

function isCanadaEmployee(input: Pick<SalaryStructureInput, "payrollCountry" | "salaryCurrency">): boolean {
  return input.payrollCountry === "CA" || input.salaryCurrency === "CAD";
}

function pfWage(basic: number): number {
  return Math.min(basic, PF_WAGE_CEILING);
}

export function employeeToStructureInput(emp: EmployeeRow, ptDefault = DEFAULT_PT_AMOUNT): SalaryStructureInput {
  return {
    salaryPackage: emp.salary_package,
    monthlyGross: emp.monthly_gross,
    basic: emp.basic ?? 0,
    hra: emp.hra ?? 0,
    conveyance: emp.conveyance ?? 0,
    bonusPercentage: emp.bonus_percentage ?? DEFAULT_BONUS_PCT,
    otherAllowances: emp.other_allowances ?? 0,
    pfApplicable: emp.pf_applicable,
    esicApplicable: emp.esic_applicable,
    employerPfApplicable: emp.employer_pf_applicable ?? emp.pf_applicable,
    employerEsicApplicable: emp.employer_esic_applicable ?? emp.esic_applicable,
    employeePfPct: emp.employee_pf_pct ?? DEFAULT_EMPLOYEE_PF_PCT,
    employerPfPct: emp.employer_pf_pct ?? DEFAULT_EMPLOYER_PF_PCT,
    employeeEsicPct: emp.employee_esic_pct ?? DEFAULT_EMPLOYEE_ESIC_PCT,
    employerEsicPct: emp.employer_esic_pct ?? DEFAULT_EMPLOYER_ESIC_PCT,
    professionalTaxAmount: emp.professional_tax_amount,
    ptApplicable: emp.pt_applicable,
    tdsApplicable: emp.tds_applicable,
    otherDeductions: emp.other_deductions ?? 0,
    payrollCountry: emp.payroll_country,
    salaryCurrency: emp.salary_currency,
  };
}

/** Monthly salary structure from master data (Employee Master). */
export function buildMonthlySalaryStructure(
  input: SalaryStructureInput,
  ptDefault = DEFAULT_PT_AMOUNT,
): SalaryStructureBreakdown {
  const isCanada = isCanadaEmployee(input);
  const basic = input.basic ?? 0;
  const hra = input.hra ?? 0;
  const conveyance = input.conveyance ?? 0;
  const bonusPercentage = input.bonusPercentage ?? DEFAULT_BONUS_PCT;
  const otherAllowances = input.otherAllowances ?? 0;
  const bonusAmount = round((basic * bonusPercentage) / 100);
  const totalEarningsA = basic + hra + conveyance + bonusAmount + otherAllowances;
  const salaryPackage = input.salaryPackage ?? input.monthlyGross ?? totalEarningsA;
  const grossForEsic = totalEarningsA;

  let employerPf = 0;
  let employerEsic = 0;
  let employeePf = 0;
  let employeeEsic = 0;

  if (!isCanada) {
    if (input.employerPfApplicable && input.pfApplicable) {
      employerPf = round((pfWage(basic) * (input.employerPfPct ?? DEFAULT_EMPLOYER_PF_PCT)) / 100);
    }
    if (input.employerEsicApplicable && input.esicApplicable && (input.monthlyGross ?? grossForEsic) <= ESIC_WAGE_CEILING) {
      employerEsic = round((grossForEsic * (input.employerEsicPct ?? DEFAULT_EMPLOYER_ESIC_PCT)) / 100);
    }
    if (input.pfApplicable) {
      employeePf = round((pfWage(basic) * (input.employeePfPct ?? DEFAULT_EMPLOYEE_PF_PCT)) / 100);
    }
    if (input.esicApplicable && (input.monthlyGross ?? grossForEsic) <= ESIC_WAGE_CEILING) {
      employeeEsic = round((grossForEsic * (input.employeeEsicPct ?? DEFAULT_EMPLOYEE_ESIC_PCT)) / 100);
    }
  }

  const totalEmployerCostB = employerPf + employerEsic;
  const difference = round(salaryPackage - (totalEarningsA + totalEmployerCostB));

  const professionalTax =
    !isCanada && input.ptApplicable
      ? input.professionalTaxAmount ?? ptDefault
      : 0;
  const tds =
    !isCanada && input.tdsApplicable ? input.otherDeductions ?? 0 : 0;
  const otherDeductions =
    !isCanada && input.tdsApplicable ? 0 : input.otherDeductions ?? 0;

  const netSalary = round(
    totalEarningsA - employeePf - employeeEsic - professionalTax - tds - otherDeductions,
  );

  return {
    salaryPackage,
    basic,
    hra,
    conveyance,
    bonusPercentage,
    bonusAmount,
    otherAllowances,
    totalEarningsA,
    employerPf,
    employerEsic,
    totalEmployerCostB,
    difference,
    employeePf,
    employeeEsic,
    professionalTax,
    tds,
    otherDeductions,
    netSalary,
    isCanada,
  };
}

function prorateFactor(line: PayrollLineRow): number {
  const div = line.payroll_days_effective ?? line.payroll_days;
  if (!div) return 0;
  return line.payable_days / div;
}

/** Cycle-level structure — pro-rates earnings; uses payroll line for engine net & deductions when present. */
export function buildPayrollSalaryStructure(
  line: PayrollLineRow,
  emp: EmployeeRow | null | undefined,
  ptDefault = DEFAULT_PT_AMOUNT,
): SalaryStructureBreakdown {
  if (!emp) {
    return buildMonthlySalaryStructure({
      monthlyGross: line.monthly_gross,
      basic: line.basic,
      bonusPercentage: DEFAULT_BONUS_PCT,
      otherAllowances: 0,
    }, ptDefault);
  }

  const monthly = buildMonthlySalaryStructure(employeeToStructureInput(emp, ptDefault), ptDefault);
  if (monthly.isCanada) {
    const stat = buildStatutoryBreakdown(line, emp);
    return {
      ...monthly,
      totalEarningsA: line.gross_earned,
      employeePf: line.pf_employee,
      employeeEsic: line.esic_employee,
      professionalTax: stat.ptEmployee,
      tds: stat.tdsLine,
      otherDeductions: stat.otherDeductions,
      netSalary: line.net_salary,
      employerPf: line.pf_employee,
      employerEsic: stat.tdsLine > 0 ? 0 : round(line.esic_employee * (2.324 / 1.66)),
      totalEmployerCostB: line.pf_employee + (line.esic_employee > 0 ? round(line.esic_employee * (2.324 / 1.66)) : 0),
      difference: round((monthly.salaryPackage) - (line.gross_earned + line.pf_employee)),
    };
  }

  const factor = prorateFactor(line);
  const basic = round(monthly.basic * factor);
  const hra = round(monthly.hra * factor);
  const conveyance = round(monthly.conveyance * factor);
  const bonusAmount = round(monthly.bonusAmount * factor);
  const otherAllowances = round(monthly.otherAllowances * factor);
  const totalEarningsA = basic + hra + conveyance + bonusAmount + otherAllowances;
  const grossForEsic = line.gross_earned > 0 ? line.gross_earned : totalEarningsA;

  let employerPf = 0;
  let employerEsic = 0;
  if (monthly.employerPf > 0) {
    employerPf = round((pfWage(basic) * (emp.employer_pf_pct ?? DEFAULT_EMPLOYER_PF_PCT)) / 100);
  }
  if (monthly.employerEsic > 0 && emp.monthly_gross <= ESIC_WAGE_CEILING) {
    employerEsic = round((grossForEsic * (emp.employer_esic_pct ?? DEFAULT_EMPLOYER_ESIC_PCT)) / 100);
  }

  const stat = buildStatutoryBreakdown(line, emp);
  const employeePf = line.pf_employee;
  const employeeEsic = line.esic_employee;
  const professionalTax = stat.ptEmployee;
  const tds = stat.tdsLine;
  const otherDeductions = stat.otherDeductions;

  return {
    salaryPackage: monthly.salaryPackage,
    basic,
    hra,
    conveyance,
    bonusPercentage: monthly.bonusPercentage,
    bonusAmount,
    otherAllowances,
    totalEarningsA,
    employerPf,
    employerEsic,
    totalEmployerCostB: employerPf + employerEsic,
    difference: round(monthly.salaryPackage - (monthly.totalEarningsA + monthly.totalEmployerCostB)),
    employeePf,
    employeeEsic,
    professionalTax,
    tds,
    otherDeductions,
    netSalary: line.net_salary,
    isCanada: false,
  };
}

export function salaryStructureSteps(s: SalaryStructureBreakdown): { label: string; value: number; group: string }[] {
  return [
    { label: "Salary Package (CTC)", value: s.salaryPackage, group: "package" },
    { label: "Basic", value: s.basic, group: "earnings" },
    { label: "HRA", value: s.hra, group: "earnings" },
    { label: "Conveyance", value: s.conveyance, group: "earnings" },
    { label: `Bonus (${s.bonusPercentage}%)`, value: s.bonusAmount, group: "earnings" },
    { label: "Other Allowances", value: s.otherAllowances, group: "earnings" },
    { label: "Total Earnings (A)", value: s.totalEarningsA, group: "total" },
    { label: "Employer PF", value: s.employerPf, group: "employer" },
    { label: "Employer ESIC", value: s.employerEsic, group: "employer" },
    { label: "Total Employer Cost (B)", value: s.totalEmployerCostB, group: "employer" },
    { label: "Difference (CTC − A − B)", value: s.difference, group: "diff" },
    { label: "Employee PF", value: s.employeePf, group: "deduct" },
    { label: "Employee ESIC", value: s.employeeEsic, group: "deduct" },
    { label: "Professional Tax", value: s.professionalTax, group: "deduct" },
    { label: "TDS", value: s.tds, group: "deduct" },
    { label: "Other Deductions", value: s.otherDeductions, group: "deduct" },
    { label: "Net Salary", value: s.netSalary, group: "net" },
  ];
}
