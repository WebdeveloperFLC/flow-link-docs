import type { AttendanceRow, EmployeeRow, PayrollCycleRow, PayrollLineRow, RollupSnapshot } from "./types";

/** Shape returned by fn_rollup_inputs / input_snapshot on payroll_lines. */
export type { RollupSnapshot };

export type AttendanceDaySplit = {
  presentDays: number;
  weeklyOffs: number;
  holidays: number;
};

export type PayableDaysBreakdown = {
  payrollDays: number;
  presentDays: number;
  weeklyOffs: number;
  holidays: number;
  leavesTaken: number;
  approvedPaidLeaves: number;
  approvedCompOffs: number;
  lateComingDeductions: number;
  mispunchDeductions: number;
  sandwichLeaveDeductions: number;
  unauthorizedLeaveDays: number;
  unapprovedLeaveDeductionDays: number;
  unpaidTraining: number;
  payableDays: number;
  formulaMode: "legacy" | "earned";
  isOverridden: boolean;
  attendanceEarned?: number;
  payrollDaysEffective?: number;
};

export type StatutoryBreakdown = {
  grossEarned: number;
  dailyRate: number;
  incentive: number;
  bonus: number;
  otPay: number;
  pfEmployee: number;
  esicEmployee: number;
  ptEmployee: number;
  tdsLine: number;
  otherDeductions: number;
  netSalary: number;
  isCanada: boolean;
};

/** India ESIC rates aligned with fn_compute_payroll (display-only employer share). */
export const ESIC_EMPLOYEE_RATE = 0.0075;
export const ESIC_EMPLOYER_RATE = 0.0325;
export const ESIC_WAGE_CEILING = 21000;
/** Canada EI employer share ≈ 1.4× employee rate (federal default). */
export const EI_EMPLOYER_MULTIPLIER = 2.324 / 1.66;

export type EmployerStatutoryBreakdown = {
  pfEmployer: number;
  esicEmployer: number;
  cppEmployer: number;
  eiEmployer: number;
  isCanada: boolean;
  show: boolean;
};

const UL_MULT = 2;

/** Split Week Off vs Holiday from attendance register (source of truth). */
export function splitAttendanceDays(att: AttendanceRow[]): AttendanceDaySplit {
  let presentDays = 0;
  let weeklyOffs = 0;
  let holidays = 0;
  for (const a of att) {
    if (a.status === "Half Day") presentDays += 0.5;
    else if (a.status === "Present" || a.status === "Late") presentDays += 1;
    else if (a.status === "Week Off") weeklyOffs += 1;
    else if (a.status === "Holiday") holidays += 1;
  }
  return {
    presentDays: Math.round(presentDays * 10) / 10,
    weeklyOffs,
    holidays,
  };
}

export function parseRollupSnapshot(raw: unknown): RollupSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as RollupSnapshot;
}

/** Applied inputs on the line (respects HR overrides). */
export function appliedInputsFromLine(line: PayrollLineRow): RollupSnapshot {
  const ov = line.override_json as RollupSnapshot | null;
  return {
    late: ov?.late ?? line.late_count,
    mispunch: ov?.mispunch ?? line.mispunch_count,
    leaves: ov?.leaves ?? line.leaves_taken,
    paid_leaves: ov?.paid_leaves ?? line.paid_leaves,
    comp_off: ov?.comp_off ?? line.comp_off,
    ul: ov?.ul ?? line.ul_count,
    sandwich: ov?.sandwich ?? line.sandwich_count,
    unpaid_training: ov?.unpaid_training ?? line.unpaid_training,
  };
}

/** Build payable-days transparency from line + optional rollup snapshot + optional attendance split. */
export function buildPayableDaysBreakdown(
  line: PayrollLineRow,
  cycle: Pick<PayrollCycleRow, "payroll_days">,
  snapshot: RollupSnapshot | null,
  attendanceSplit?: AttendanceDaySplit | null,
): PayableDaysBreakdown {
  const applied = appliedInputsFromLine(line);
  const formulaMode =
    (line.formula_mode as "legacy" | "earned" | undefined) ??
    (snapshot?.formula_mode === "earned" ? "earned" : "legacy");

  const presentDays =
    attendanceSplit?.presentDays ??
    snapshot?.present ??
    snapshot?.working ??
    0;
  const weeklyOffs =
    attendanceSplit?.weeklyOffs ??
    (snapshot?.week_off != null && snapshot?.holiday != null
      ? Math.max(0, snapshot.week_off - snapshot.holiday)
      : snapshot?.week_off ?? 0);
  const holidays =
    attendanceSplit?.holidays ?? snapshot?.holiday ?? 0;

  const lateDed = line.late_deduction;
  const misDed = line.mispunch_deduction;

  return {
    payrollDays: cycle.payroll_days ?? line.payroll_days,
    presentDays,
    weeklyOffs,
    holidays,
    leavesTaken: applied.leaves ?? line.leaves_taken,
    approvedPaidLeaves: applied.paid_leaves ?? line.paid_leaves,
    approvedCompOffs: applied.comp_off ?? line.comp_off,
    lateComingDeductions: lateDed,
    mispunchDeductions: misDed,
    sandwichLeaveDeductions: applied.sandwich ?? line.sandwich_count,
    unauthorizedLeaveDays: applied.ul ?? line.ul_count,
    unapprovedLeaveDeductionDays: (applied.ul ?? line.ul_count) * UL_MULT,
    unpaidTraining: applied.unpaid_training ?? line.unpaid_training,
    payableDays: line.payable_days,
    formulaMode,
    isOverridden: line.is_overridden,
    attendanceEarned: line.attendance_earned ?? snapshot?.attendance_earned,
    payrollDaysEffective: line.payroll_days_effective ?? snapshot?.payroll_days_effective,
  };
}

export function buildStatutoryBreakdown(
  line: PayrollLineRow,
  emp: EmployeeRow | null | undefined,
): StatutoryBreakdown {
  const isCanada =
    emp?.payroll_country === "CA" || emp?.salary_currency === "CAD";
  const pt = line.pt_employee ?? 0;
  const other = emp?.other_deductions ?? 0;
  const tdsLine =
    !isCanada && emp?.tds_applicable ? other : isCanada && emp?.tds_applicable ? pt : 0;

  return {
    grossEarned: line.gross_earned,
    dailyRate: line.daily_rate,
    incentive: line.incentive,
    bonus: line.bonus,
    otPay: line.ot_pay ?? 0,
    pfEmployee: line.pf_employee,
    esicEmployee: line.esic_employee,
    ptEmployee: isCanada ? 0 : pt,
    tdsLine: isCanada ? pt : emp?.tds_applicable ? other : 0,
    otherDeductions: isCanada ? 0 : emp?.tds_applicable ? 0 : other,
    netSalary: line.net_salary,
    isCanada,
  };
}

/** Employer statutory — informational only; not part of net pay (D8 report-only). */
export function buildEmployerStatutoryBreakdown(
  line: PayrollLineRow,
  emp: EmployeeRow | null | undefined,
): EmployerStatutoryBreakdown {
  const isCanada =
    emp?.payroll_country === "CA" || emp?.salary_currency === "CAD";

  if (line.salary_structure_mode && !isCanada) {
    const pfEmployer = line.employer_pf ?? 0;
    const esicEmployer = line.employer_esic ?? 0;
    return {
      pfEmployer,
      esicEmployer,
      cppEmployer: 0,
      eiEmployer: 0,
      isCanada: false,
      show: pfEmployer > 0 || esicEmployer > 0,
    };
  }

  if (isCanada) {
    const cppEmployer = line.pf_employee > 0 ? line.pf_employee : 0;
    const eiEmployer =
      line.esic_employee > 0
        ? Math.round(line.esic_employee * EI_EMPLOYER_MULTIPLIER)
        : 0;
    return {
      pfEmployer: 0,
      esicEmployer: 0,
      cppEmployer,
      eiEmployer,
      isCanada: true,
      show: cppEmployer > 0 || eiEmployer > 0,
    };
  }

  const pfEmployer =
    emp?.pf_applicable && line.pf_employee > 0 ? line.pf_employee : 0;
  const esicEmployer =
    emp?.esic_applicable &&
    (emp.monthly_gross ?? 0) <= ESIC_WAGE_CEILING &&
    line.esic_employee > 0
      ? Math.round(line.gross_earned * ESIC_EMPLOYER_RATE)
      : 0;

  return {
    pfEmployer,
    esicEmployer,
    cppEmployer: 0,
    eiEmployer: 0,
    isCanada: false,
    show: pfEmployer > 0 || esicEmployer > 0,
  };
}

export type BreakdownStep = {
  label: string;
  value: number | string;
  tone?: "add" | "deduct" | "neutral" | "result";
  hint?: string;
};

/** Human-readable steps for HR verification before approval. */
export function payableDaysSteps(b: PayableDaysBreakdown): BreakdownStep[] {
  const steps: BreakdownStep[] = [
    { label: "Payroll days (cycle)", value: b.payrollDays, tone: "neutral" },
    { label: "Present days", value: b.presentDays, tone: "neutral", hint: "From attendance register" },
    { label: "Weekly offs", value: b.weeklyOffs, tone: "neutral" },
    { label: "Holidays", value: b.holidays, tone: "neutral" },
    { label: "Leaves taken", value: b.leavesTaken, tone: "deduct", hint: "Attendance leave marks" },
    { label: "Approved paid leaves", value: b.approvedPaidLeaves, tone: "add" },
    { label: "Approved comp-offs", value: b.approvedCompOffs, tone: "add" },
    {
      label: "Late coming deductions",
      value: b.lateComingDeductions,
      tone: "deduct",
      hint: "Slab-based from approved late count",
    },
    {
      label: "Mispunch deductions",
      value: b.mispunchDeductions,
      tone: "deduct",
      hint: "After 2 free mispunches per month",
    },
    {
      label: "Sandwich leave deductions",
      value: b.sandwichLeaveDeductions,
      tone: "deduct",
    },
    {
      label: "Unapproved leave deductions",
      value: b.unapprovedLeaveDeductionDays,
      tone: "deduct",
      hint: `${b.unauthorizedLeaveDays} UL day(s) × ${UL_MULT}`,
    },
    { label: "Unpaid training", value: b.unpaidTraining, tone: "deduct" },
    { label: "Payable days", value: b.payableDays, tone: "result" },
  ];

  if (b.formulaMode === "earned" && b.attendanceEarned != null) {
    steps.splice(1, 0, {
      label: "Attendance earned (Phase C)",
      value: b.attendanceEarned,
      tone: "neutral",
      hint: b.payrollDaysEffective
        ? `Effective payroll days: ${b.payrollDaysEffective}`
        : undefined,
    });
  }

  return steps;
}

export function statutorySteps(s: StatutoryBreakdown): BreakdownStep[] {
  const pfLabel = s.isCanada ? "CPP (employee)" : "PF (employee)";
  const esicLabel = s.isCanada ? "EI (employee)" : "ESIC (employee)";
  const taxLabel = s.isCanada ? "Income tax + other" : "Professional tax (PT)";

  return [
    { label: "Daily rate", value: s.dailyRate, tone: "neutral" },
    { label: "Gross earned", value: s.grossEarned, tone: "neutral" },
    { label: "Incentive", value: s.incentive, tone: "add" },
    { label: "Bonus", value: s.bonus, tone: "add" },
    ...(s.otPay > 0 ? [{ label: "OT pay", value: s.otPay, tone: "add" as const }] : []),
    { label: pfLabel, value: s.pfEmployee, tone: "deduct" },
    { label: esicLabel, value: s.esicEmployee, tone: "deduct" },
    ...(s.isCanada && s.tdsLine > 0
      ? [{ label: "Income tax", value: s.tdsLine, tone: "deduct" as const }]
      : s.ptEmployee > 0
        ? [{ label: taxLabel, value: s.ptEmployee, tone: "deduct" as const }]
        : []),
    ...(s.tdsLine > 0 && !s.isCanada
      ? [{ label: "TDS / other statutory", value: s.tdsLine, tone: "deduct" as const }]
      : []),
    ...(s.otherDeductions > 0
      ? [{ label: "Other deductions", value: s.otherDeductions, tone: "deduct" as const }]
      : []),
    { label: "Net salary", value: s.netSalary, tone: "result" },
  ];
}

/** Salary processing — always from monthly_gross × payable days (persisted on line). */
export function salaryProcessingSteps(line: PayrollLineRow): BreakdownStep[] {
  return [
    { label: "Monthly gross (wage base)", value: line.monthly_gross, tone: "neutral" },
    { label: "Daily rate", value: line.daily_rate, tone: "neutral" },
    { label: "Payable days", value: line.payable_days, tone: "neutral" },
    {
      label: "Gross earned",
      value: line.gross_earned,
      tone: "result",
      hint: "daily rate × payable days — not from CTC",
    },
  ];
}

export function employerStatutorySteps(e: EmployerStatutoryBreakdown): BreakdownStep[] {
  if (e.isCanada) {
    return [
      ...(e.cppEmployer > 0
        ? [{ label: "CPP (employer)", value: e.cppEmployer, tone: "neutral" as const }]
        : []),
      ...(e.eiEmployer > 0
        ? [{ label: "EI (employer)", value: e.eiEmployer, tone: "neutral" as const }]
        : []),
    ];
  }
  return [
    ...(e.pfEmployer > 0
      ? [{ label: "PF (employer)", value: e.pfEmployer, tone: "neutral" as const }]
      : []),
    ...(e.esicEmployer > 0
      ? [{ label: "ESIC (employer)", value: e.esicEmployer, tone: "neutral" as const }]
      : []),
  ];
}
