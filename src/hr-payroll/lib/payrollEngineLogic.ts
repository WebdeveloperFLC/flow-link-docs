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
};

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

export function computePayroll(input: PayrollEngineInput): PayrollEngineResult {
  const k = lateDeductionDays(input.late ?? 0);
  const n = mispunchDeductionDays(input.mispunch ?? 0, input.freeMispunch ?? 2);
  const ulMult = input.ulMult ?? 2;
  const payable =
    input.payrollDays -
    (input.leaves ?? 0) +
    (input.paidLeaves ?? 0) +
    (input.compoff ?? 0) -
    k -
    (input.ul ?? 0) * ulMult -
    (input.sandwich ?? 0) -
    n -
    (input.unpaidTraining ?? 0);

  const daily = Math.round((input.monthly / input.payrollDays) * 100) / 100;
  const gross = Math.round(daily * payable);
  const basic = input.basic ?? Math.round(input.monthly * 0.5);
  const incentive = input.incentive ?? 0;
  const bonus = input.bonus ?? 0;

  const isCanada = input.payrollCountry === "CA";
  let pfEmployee: number;
  let esicEmployee: number;
  let ptEmployee: number;

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
    payableDays: Math.round(payable * 100) / 100,
    dailyRate: daily,
    grossEarned: gross,
    pfEmployee,
    esicEmployee,
    ptEmployee,
    incentive,
    bonus,
    netSalary,
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
