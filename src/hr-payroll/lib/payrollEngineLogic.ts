/**
 * Payroll engine mirror for automated regression (Excel / Postgres parity).
 * Source of truth remains fn_compute_payroll in Supabase — this module is for CI only.
 */

import { lateDeductionFromSlab } from "./leavePolicy";

export type PayrollEngineInput = {
  payrollDays: number;
  monthly: number;
  basic: number;
  incentive?: number;
  bonus?: number;
  pfApplicable?: boolean;
  esicApplicable?: boolean;
  leaves?: number;
  paidLeaves?: number;
  late?: number;
  ul?: number;
  sandwich?: number;
  mispunch?: number;
  compoff?: number;
  unpaidTraining?: number;
  ptApplicable?: boolean;
  professionalTax?: number;
  ulMult?: number;
  freeMispunch?: number;
  payrollCountry?: "IN" | "CA";
  cppRate?: number;
  eiRate?: number;
  incomeTaxFlat?: number;
  incomeTaxMode?: "flat" | "brackets";
  incomeTaxBrackets?: { upTo: number | null; rate: number }[];
  otherDeductions?: number;
  tdsApplicable?: boolean;
  /** Phase C — default legacy preserves pre-Phase-C payable */
  formulaMode?: "legacy" | "earned";
  payrollDaysEffective?: number;
  attendanceEarned?: number;
  /** Phase 1 salary structure — when true, uses structure fields (India only) */
  structureEnabled?: boolean;
  structure?: SalaryStructureResolved;
};

/** Monthly structure resolved from employee master (mirrors fn_resolve_employee_salary_structure). */
export type SalaryStructureResolved = {
  salaryPackage: number;
  basic: number;
  hra: number;
  conveyance: number;
  bonusPercentage: number;
  bonusAmount: number;
  otherAllowances: number;
  totalEarningsA: number;
  employeePfPct: number;
  employerPfPct: number;
  employeeEsicPct: number;
  employerEsicPct: number;
  employerPfApplicable: boolean;
  employerEsicApplicable: boolean;
  ptAmount: number;
  employerPf: number;
  employerEsic: number;
  totalEmployerCostB: number;
  structureDifference: number;
};

export function resolveEmployeeSalaryStructure(
  emp: {
    salaryPackage?: number | null;
    basic?: number;
    hra?: number;
    conveyance?: number;
    bonusPercentage?: number | null;
    otherAllowances?: number;
    pfApplicable?: boolean;
    esicApplicable?: boolean;
    employerPfApplicable?: boolean;
    employerEsicApplicable?: boolean;
    employeePfPct?: number;
    employerPfPct?: number;
    employeeEsicPct?: number;
    employerEsicPct?: number;
    ptApplicable?: boolean;
    professionalTaxAmount?: number | null;
  },
  ptDefault = 200,
): SalaryStructureResolved {
  const basic = emp.basic ?? 0;
  const hra = emp.hra ?? 0;
  const conveyance = emp.conveyance ?? 0;
  const other = emp.otherAllowances ?? 0;
  const bonusPct = emp.bonusPercentage ?? 8.33;
  const bonusAmount = Math.round((basic * bonusPct) / 100);
  const totalEarningsA = basic + hra + conveyance + bonusAmount + other;
  const salaryPackage = emp.salaryPackage ?? totalEarningsA;
  const pfWage = Math.min(basic, 15000);
  const ptAmount =
    emp.ptApplicable ? (emp.professionalTaxAmount ?? ptDefault) : 0;

  let employerPf = 0;
  let employerEsic = 0;
  if ((emp.employerPfApplicable ?? emp.pfApplicable) && emp.pfApplicable) {
    employerPf = Math.round((pfWage * (emp.employerPfPct ?? 12)) / 100);
  }
  if (
    (emp.employerEsicApplicable ?? emp.esicApplicable) &&
    emp.esicApplicable &&
    totalEarningsA <= 21000
  ) {
    employerEsic = Math.round((totalEarningsA * (emp.employerEsicPct ?? 3.25)) / 100);
  }

  const totalEmployerCostB = employerPf + employerEsic;
  const structureDifference = Math.round(salaryPackage - (totalEarningsA + totalEmployerCostB));

  return {
    salaryPackage,
    basic,
    hra,
    conveyance,
    bonusPercentage: bonusPct,
    bonusAmount,
    otherAllowances: other,
    totalEarningsA,
    employeePfPct: emp.employeePfPct ?? 12,
    employerPfPct: emp.employerPfPct ?? 12,
    employeeEsicPct: emp.employeeEsicPct ?? 0.75,
    employerEsicPct: emp.employerEsicPct ?? 3.25,
    employerPfApplicable: emp.employerPfApplicable ?? !!emp.pfApplicable,
    employerEsicApplicable: emp.employerEsicApplicable ?? !!emp.esicApplicable,
    ptAmount,
    employerPf,
    employerEsic,
    totalEmployerCostB,
    structureDifference,
  };
}

export type PayrollEngineResult = {
  lateDeduction: number;
  mispunchDeduction: number;
  payableDays: number;
  dailyRate: number;
  grossEarned: number;
  pfEmployee: number;
  esicEmployee: number;
  ptEmployee: number;
  incentive: number;
  bonus: number;
  netSalary: number;
  salaryStructureMode?: boolean;
  salaryPackage?: number;
  structureBasic?: number;
  structureHra?: number;
  structureConveyance?: number;
  structureBonus?: number;
  structureOtherAllowances?: number;
  totalEarningsA?: number;
  employerPf?: number;
  employerEsic?: number;
  totalEmployerCostB?: number;
  structureDifference?: number;
};

export function lateDeductionDays(late: number): number {
  return lateDeductionFromSlab(late);
}

export function mispunchDeductionDays(mispunch: number, freePerMonth = 2): number {
  if (mispunch <= freePerMonth) return 0;
  return (mispunch - freePerMonth) * 0.5;
}

export function calendarDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function canadaIncomeTax(
  gross: number,
  tdsApplicable: boolean,
  mode: "flat" | "brackets" = "flat",
  flatRate = 0,
  brackets: { upTo: number | null; rate: number }[] = [],
): number {
  if (!tdsApplicable) return 0;
  if (mode !== "brackets" || brackets.length === 0) {
    return Math.round(gross * flatRate);
  }
  let remaining = gross * 12;
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    const rate = b.rate;
    if (b.upTo == null) {
      tax += remaining * rate;
      break;
    }
    const slice = Math.max(Math.min(remaining, b.upTo - prev), 0);
    tax += slice * rate;
    remaining -= slice;
    prev = b.upTo;
    if (remaining <= 0) break;
  }
  return Math.round(tax / 12);
}

export type SalaryPayableDaysResult = {
  formulaMode: "legacy" | "earned";
  payrollDays: number;
  payrollDaysEffective?: number | null;
  attendanceEarned?: number | null;
  leavesTaken: number;
  paidLeaves: number;
  compOff: number;
  lateCount: number;
  lateDeduction: number;
  mispunchCount: number;
  mispunchDeduction: number;
  ulCount: number;
  ulDeductionDays: number;
  sandwichDeduction: number;
  unpaidTraining: number;
  payableDays: number;
  dailyRateDivisor: number;
};

/** Step 1 — attendance-driven payable days (mirrors fn_compute_salary_payable_days). */
export function computeSalaryPayableDays(input: {
  payrollDays: number;
  leaves?: number;
  paidLeaves?: number;
  late?: number;
  ul?: number;
  sandwich?: number;
  mispunch?: number;
  compoff?: number;
  unpaidTraining?: number;
  ulMult?: number;
  formulaMode?: "legacy" | "earned";
  payrollDaysEffective?: number;
  attendanceEarned?: number;
}): SalaryPayableDaysResult {
  const k = lateDeductionDays(input.late ?? 0);
  const n = mispunchDeductionDays(input.mispunch ?? 0);
  const ulMult = input.ulMult ?? 2;
  const formulaMode = input.formulaMode ?? "legacy";
  const ulDed = (input.ul ?? 0) * ulMult;

  let payable: number;
  let divisor: number;
  let attendanceEarned: number | null = null;

  if (formulaMode === "earned") {
    attendanceEarned = input.attendanceEarned ?? 0;
    payable =
      attendanceEarned - k - ulDed - (input.sandwich ?? 0) - n - (input.unpaidTraining ?? 0);
    divisor = input.payrollDaysEffective ?? input.payrollDays;
  } else {
    payable =
      input.payrollDays -
      (input.leaves ?? 0) +
      (input.paidLeaves ?? 0) +
      (input.compoff ?? 0) -
      k -
      ulDed -
      (input.sandwich ?? 0) -
      n -
      (input.unpaidTraining ?? 0);
    divisor = input.payrollDays;
  }

  return {
    formulaMode,
    payrollDays: input.payrollDays,
    payrollDaysEffective: input.payrollDaysEffective ?? null,
    attendanceEarned,
    leavesTaken: input.leaves ?? 0,
    paidLeaves: input.paidLeaves ?? 0,
    compOff: input.compoff ?? 0,
    lateCount: input.late ?? 0,
    lateDeduction: k,
    mispunchCount: input.mispunch ?? 0,
    mispunchDeduction: n,
    ulCount: input.ul ?? 0,
    ulDeductionDays: ulDed,
    sandwichDeduction: input.sandwich ?? 0,
    unpaidTraining: input.unpaidTraining ?? 0,
    payableDays: Math.round(payable * 100) / 100,
    dailyRateDivisor: divisor,
  };
}

export function computePayroll(input: PayrollEngineInput): PayrollEngineResult {
  const payableResult = computeSalaryPayableDays({
    payrollDays: input.payrollDays,
    leaves: input.leaves,
    paidLeaves: input.paidLeaves,
    late: input.late,
    ul: input.ul,
    sandwich: input.sandwich,
    mispunch: input.mispunch,
    compoff: input.compoff,
    unpaidTraining: input.unpaidTraining,
    ulMult: input.ulMult,
    formulaMode: input.formulaMode,
    payrollDaysEffective: input.payrollDaysEffective,
    attendanceEarned: input.attendanceEarned,
  });

  const k = payableResult.lateDeduction;
  const n = payableResult.mispunchDeduction;
  const payable = payableResult.payableDays;
  const divisor = payableResult.dailyRateDivisor;
  const isCanada = input.payrollCountry === "CA";
  const pfCeiling = 15000;
  const esicCeiling = 21000;
  const incentive = input.incentive ?? 0;

  // Salary ALWAYS from monthly_gross (never CTC / structure Total A)
  const daily = Math.round((input.monthly / divisor) * 100) / 100;
  const gross = Math.round(daily * payable);

  // ---- Statutory with structure rates (India) — gross already set from payable days ----
  if (input.structureEnabled && !isCanada && input.structure) {
    const s = input.structure;
    const factor = divisor > 0 ? payable / divisor : 0;
    const esicMonthly = s.totalEarningsA;

    const structureBasic = Math.round(s.basic * factor);
    const structureHra = Math.round(s.hra * factor);
    const structureConveyance = Math.round(s.conveyance * factor);
    const structureBonus = Math.round(s.bonusAmount * factor);
    const structureOther = Math.round(s.otherAllowances * factor);

    const pfWage = Math.min(structureBasic, pfCeiling);
    const pfEmployee =
      input.pfApplicable !== false
        ? Math.round((pfWage * s.employeePfPct) / 100)
        : 0;
    const esicEmployee =
      input.esicApplicable && esicMonthly <= esicCeiling
        ? Math.round((gross * s.employeeEsicPct) / 100)
        : 0;
    let ptEmployee = input.ptApplicable === true ? s.ptAmount : 0;
    if (input.tdsApplicable) {
      ptEmployee += input.otherDeductions ?? 0;
    }

    const employerPf =
      s.employerPfApplicable && input.pfApplicable !== false
        ? Math.round((pfWage * s.employerPfPct) / 100)
        : 0;
    const employerEsic =
      s.employerEsicApplicable && input.esicApplicable && esicMonthly <= esicCeiling
        ? Math.round((gross * s.employerEsicPct) / 100)
        : 0;

    const netSalary = Math.round(gross + incentive - pfEmployee - esicEmployee - ptEmployee);

    return {
      lateDeduction: k,
      mispunchDeduction: n,
      payableDays: payable,
      dailyRate: daily,
      grossEarned: gross,
      pfEmployee,
      esicEmployee,
      ptEmployee,
      incentive,
      bonus: 0,
      netSalary,
      salaryStructureMode: true,
      salaryPackage: s.salaryPackage,
      structureBasic,
      structureHra,
      structureConveyance,
      structureBonus,
      structureOtherAllowances: structureOther,
      totalEarningsA: gross,
      employerPf,
      employerEsic,
      totalEmployerCostB: s.totalEmployerCostB,
      structureDifference: s.structureDifference,
    };
  }

  // ---- Legacy statutory path ----
  let pfEmployee: number;
  let esicEmployee: number;
  let ptEmployee: number;
  const basic = input.basic ?? Math.round(input.monthly * 0.5);
  const bonus = input.bonus ?? 0;

  if (isCanada) {
    const cppRate = input.cppRate ?? 0.0595;
    const eiRate = input.eiRate ?? 0.0166;
    pfEmployee = Math.round(gross * cppRate);
    esicEmployee = Math.round(gross * eiRate);
    ptEmployee =
      canadaIncomeTax(
        gross,
        !!input.tdsApplicable,
        input.incomeTaxMode ?? "flat",
        input.incomeTaxFlat ?? 0,
        input.incomeTaxBrackets ?? [],
      ) + (input.otherDeductions ?? 0);
  } else {
    const pfWage = Math.min(basic, 15000);
    pfEmployee = input.pfApplicable !== false ? Math.round(pfWage * 0.12) : 0;
    esicEmployee =
      input.esicApplicable && input.monthly <= 21000 ? Math.round(gross * 0.0075) : 0;
    ptEmployee = input.ptApplicable === true ? (input.professionalTax ?? 200) : 0;
    if (input.tdsApplicable) {
      ptEmployee += input.otherDeductions ?? 0;
    }
  }

  const netSalary = Math.round(gross + incentive + bonus - pfEmployee - esicEmployee - ptEmployee);

  return {
    lateDeduction: k,
    mispunchDeduction: n,
    payableDays: payable,
    dailyRate: daily,
    grossEarned: gross,
    pfEmployee,
    esicEmployee,
    ptEmployee,
    incentive,
    bonus,
    netSalary,
    salaryStructureMode: false,
  };
}

export type PayrollTestVector = {
  id: string;
  input: PayrollEngineInput;
  expected: Partial<PayrollEngineResult>;
};

/** Golden 30 vectors from docs — HR Payroll business rules v1 */
export const PAYROLL_TEST_VECTORS: PayrollTestVector[] = [
  { id: "TV01", input: { payrollDays: 30, monthly: 42000, basic: 21000 }, expected: { payableDays: 30, dailyRate: 1400, grossEarned: 42000, pfEmployee: 1800, netSalary: 40200 } },
  { id: "TV02", input: { payrollDays: 30, monthly: 42000, basic: 21000, mispunch: 3 }, expected: { payableDays: 29.5, mispunchDeduction: 0.5, grossEarned: 41300, netSalary: 39500 } },
  { id: "TV02A", input: { payrollDays: 30, monthly: 42000, basic: 21000, mispunch: 3, ptApplicable: true, professionalTax: 200 }, expected: { payableDays: 29.5, ptEmployee: 200, netSalary: 39300 } },
  { id: "TV03", input: { payrollDays: 30, monthly: 30000, basic: 15000, late: 3 }, expected: { payableDays: 29, lateDeduction: 1, netSalary: 27200 } },
  { id: "TV04", input: { payrollDays: 30, monthly: 30000, basic: 15000, late: 4 }, expected: { payableDays: 28.5, lateDeduction: 1.5, netSalary: 26700 } },
  { id: "TV05", input: { payrollDays: 30, monthly: 30000, basic: 15000, late: 6 }, expected: { payableDays: 28.5, lateDeduction: 1.5, netSalary: 26700 } },
  { id: "TV06", input: { payrollDays: 30, monthly: 30000, basic: 15000, late: 7 }, expected: { payableDays: 28, lateDeduction: 2, netSalary: 26200 } },
  { id: "TV07", input: { payrollDays: 30, monthly: 30000, basic: 15000, late: 27 }, expected: { payableDays: 25, lateDeduction: 5, netSalary: 23200 } },
  { id: "TV08", input: { payrollDays: 30, monthly: 30000, basic: 15000, late: 28 }, expected: { payableDays: 24.5, lateDeduction: 5.5, netSalary: 22700 } },
  { id: "TV09", input: { payrollDays: 30, monthly: 30000, basic: 15000, late: 45 }, expected: { payableDays: 22, lateDeduction: 8, netSalary: 20200 } },
  { id: "TV10", input: { payrollDays: 30, monthly: 36000, basic: 18000, mispunch: 2 }, expected: { payableDays: 30, netSalary: 34200 } },
  { id: "TV11", input: { payrollDays: 30, monthly: 36000, basic: 18000, mispunch: 3 }, expected: { payableDays: 29.5, netSalary: 33600 } },
  { id: "TV12", input: { payrollDays: 30, monthly: 36000, basic: 18000, mispunch: 5 }, expected: { payableDays: 28.5, netSalary: 32400 } },
  { id: "TV13", input: { payrollDays: 30, monthly: 40000, basic: 20000, ul: 1 }, expected: { payableDays: 28, grossEarned: 37333, netSalary: 35533 } },
  { id: "TV14", input: { payrollDays: 30, monthly: 40000, basic: 20000, ul: 2 }, expected: { payableDays: 26, netSalary: 32867 } },
  { id: "TV15", input: { payrollDays: 30, monthly: 40000, basic: 20000, sandwich: 1 }, expected: { payableDays: 29, netSalary: 36867 } },
  { id: "TV16", input: { payrollDays: 30, monthly: 40000, basic: 20000, sandwich: 2 }, expected: { payableDays: 28, netSalary: 35533 } },
  { id: "TV17", input: { payrollDays: 30, monthly: 40000, basic: 20000, leaves: 2, paidLeaves: 2 }, expected: { payableDays: 30, netSalary: 38200 } },
  { id: "TV18", input: { payrollDays: 30, monthly: 40000, basic: 20000, leaves: 2 }, expected: { payableDays: 28, netSalary: 35533 } },
  { id: "TV19", input: { payrollDays: 30, monthly: 40000, basic: 20000, compoff: 1 }, expected: { payableDays: 31, netSalary: 39533 } },
  { id: "TV20", input: { payrollDays: 30, monthly: 40000, basic: 20000, leaves: 1, compoff: 2 }, expected: { payableDays: 31, netSalary: 39533 } },
  { id: "TV21", input: { payrollDays: 30, monthly: 40000, basic: 20000, unpaidTraining: 7 }, expected: { payableDays: 23, netSalary: 28867 } },
  { id: "TV22", input: { payrollDays: 30, monthly: 42000, basic: 21000, late: 7, mispunch: 3, ul: 1, sandwich: 1 }, expected: { payableDays: 24.5, netSalary: 32500 } },
  { id: "TV23", input: { payrollDays: 30, monthly: 18000, basic: 9000, esicApplicable: true }, expected: { esicEmployee: 135, pfEmployee: 1080, netSalary: 16785 } },
  { id: "TV24", input: { payrollDays: 30, monthly: 42000, basic: 21000, esicApplicable: true }, expected: { esicEmployee: 0, netSalary: 40200 } },
  { id: "TV25", input: { payrollDays: 30, monthly: 60000, basic: 30000 }, expected: { pfEmployee: 1800, netSalary: 58200 } },
  { id: "TV26", input: { payrollDays: 30, monthly: 42000, basic: 21000, pfApplicable: false }, expected: { pfEmployee: 0, netSalary: 42000 } },
  { id: "TV27", input: { payrollDays: 30, monthly: 40000, basic: 20000, incentive: 5000, bonus: 2000, ptApplicable: false }, expected: { netSalary: 45200 } },
  { id: "TV28", input: { payrollDays: 28, monthly: 42000, basic: 21000 }, expected: { payableDays: 28, dailyRate: 1500, grossEarned: 42000, netSalary: 40200 } },
  { id: "TV29", input: { payrollDays: 31, monthly: 46500, basic: 23250, late: 10, mispunch: 4 }, expected: { payableDays: 27.5, grossEarned: 41250, netSalary: 39450 } },
  { id: "TV30", input: { payrollDays: 30, monthly: 50000, basic: 25000, leaves: 3, paidLeaves: 2, late: 13, mispunch: 6, ul: 1, sandwich: 2, compoff: 1, unpaidTraining: 2, incentive: 4500 }, expected: { payableDays: 19, grossEarned: 31667, netSalary: 34367 } },
  { id: "TV31", input: { payrollDays: 30, monthly: 4500, basic: 2250, payrollCountry: "CA" }, expected: { payableDays: 30, grossEarned: 4500, pfEmployee: 268, esicEmployee: 75, ptEmployee: 0, netSalary: 4157 } },
  { id: "TV32", input: { payrollDays: 30, monthly: 4500, basic: 2250, payrollCountry: "CA", mispunch: 3 }, expected: { payableDays: 29.5, grossEarned: 4425, pfEmployee: 263, esicEmployee: 73, netSalary: 4089 } },
  {
    id: "TV33",
    input: {
      payrollDays: 30,
      monthly: 6000,
      basic: 3000,
      payrollCountry: "CA",
      tdsApplicable: true,
      incomeTaxMode: "brackets",
      incomeTaxBrackets: [
        { upTo: 55867, rate: 0.15 },
        { upTo: 111733, rate: 0.205 },
        { upTo: null, rate: 0.26 },
      ],
    },
    expected: { grossEarned: 6000, pfEmployee: 357, esicEmployee: 100, ptEmployee: 974, netSalary: 4569 },
  },
];

/** Salary structure engine vectors — structure mode ON (TV-STRUCT-*) */
export const PAYROLL_STRUCTURE_TEST_VECTORS: PayrollTestVector[] = [
  {
    id: "TV-STRUCT-01",
    input: {
      payrollDays: 30,
      monthly: 42000,
      basic: 27500,
      structureEnabled: true,
      pfApplicable: true,
      ptApplicable: true,
      structure: resolveEmployeeSalaryStructure({
        salaryPackage: 55062,
        basic: 27500,
        hra: 11000,
        bonusPercentage: 8.33,
        pfApplicable: true,
        employerPfApplicable: true,
        ptApplicable: true,
        professionalTaxAmount: 200,
      }),
    },
    expected: {
      payableDays: 30,
      dailyRate: 1400,
      grossEarned: 42000,
      structureBonus: 2291,
      pfEmployee: 1800,
      ptEmployee: 200,
      netSalary: 40000,
      salaryStructureMode: true,
      structureDifference: 12471,
      bonus: 0,
    },
  },
  {
    id: "TV-STRUCT-02",
    input: {
      payrollDays: 30,
      monthly: 42000,
      basic: 30000,
      structureEnabled: true,
      pfApplicable: true,
      structure: resolveEmployeeSalaryStructure({
        salaryPackage: 55062,
        basic: 30000,
        hra: 11000,
        bonusPercentage: 8.33,
        pfApplicable: true,
        employerPfApplicable: true,
      }),
    },
    expected: {
      grossEarned: 42000,
      structureBonus: 2499,
      pfEmployee: 1800,
      netSalary: 40200,
      structureDifference: 9763,
    },
  },
  {
    id: "TV-STRUCT-03",
    input: {
      payrollDays: 30,
      monthly: 18000,
      basic: 9000,
      structureEnabled: true,
      pfApplicable: true,
      esicApplicable: true,
      structure: resolveEmployeeSalaryStructure({
        basic: 9000,
        hra: 8250,
        bonusPercentage: 8.33,
        pfApplicable: true,
        esicApplicable: true,
        employerPfApplicable: true,
        employerEsicApplicable: true,
        employeePfPct: 12,
        employeeEsicPct: 0.75,
      }),
    },
    expected: {
      grossEarned: 18000,
      pfEmployee: 1080,
      esicEmployee: 135,
      netSalary: 16785,
    },
  },
  {
    id: "TV-STRUCT-04",
    input: {
      payrollDays: 30,
      monthly: 42000,
      basic: 27500,
      structureEnabled: true,
      pfApplicable: true,
      structure: resolveEmployeeSalaryStructure({
        basic: 27500,
        hra: 11000,
        bonusPercentage: 8.33,
        pfApplicable: true,
        employeePfPct: 10,
      }),
    },
    expected: {
      grossEarned: 42000,
      pfEmployee: 1500,
      netSalary: 40500,
    },
  },
  {
    id: "TV-STRUCT-05",
    input: {
      payrollDays: 30,
      monthly: 42000,
      basic: 27500,
      bonus: 5000,
      structureEnabled: true,
      pfApplicable: true,
      structure: resolveEmployeeSalaryStructure({
        basic: 27500,
        hra: 11000,
        bonusPercentage: 8.33,
        pfApplicable: true,
      }),
    },
    expected: {
      bonus: 0,
      grossEarned: 42000,
    },
  },
];

export function runVectorSuite(vectors = PAYROLL_TEST_VECTORS) {
  const failures: { id: string; field: string; expected: unknown; actual: unknown }[] = [];
  for (const v of vectors) {
    const r = computePayroll(v.input);
    for (const [key, exp] of Object.entries(v.expected)) {
      const actual = r[key as keyof PayrollEngineResult];
      if (actual !== exp) {
        failures.push({ id: v.id, field: key, expected: exp, actual });
      }
    }
  }
  return { total: vectors.length, passed: vectors.length - failures.length, failures };
}
