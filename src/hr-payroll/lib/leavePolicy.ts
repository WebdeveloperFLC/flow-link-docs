import type { LeaveBalanceRow, LeaveRequestRow } from "./types";

/** Paid leave types employees may apply for (Unpaid is auto-selected when rules block paid). */
export const PAID_APPLY_LEAVE_TYPES = ["Casual Leave", "Sick Leave"] as const;
export const UNPAID_LEAVE_TYPE = "Unpaid Leave";
export const MONTHLY_PAID_LEAVE_CAP = 1.5;

export type PaidApplyLeaveType = (typeof PAID_APPLY_LEAVE_TYPES)[number];

export function leaveBalanceRemaining(b: Pick<LeaveBalanceRow, "accrued" | "taken">): number {
  return Math.max(0, Number(b.accrued) - Number(b.taken));
}

export function balanceForType(balances: LeaveBalanceRow[], type: string): LeaveBalanceRow | undefined {
  return balances.find((b) => b.type === type);
}

/** Sum Casual + Sick days already taken or pending in the calendar month of refDate (YYYY-MM-DD). */
export function monthlyPaidLeaveUsed(
  requests: Pick<LeaveRequestRow, "type" | "days" | "from_date" | "status" | "employee_id">[],
  employeeId: string,
  refDate: string,
  excludeRequestId?: string,
): number {
  if (!refDate) return 0;
  const monthPrefix = refDate.slice(0, 7);
  return requests
    .filter(
      (r) =>
        r.employee_id === employeeId &&
        r.id !== excludeRequestId &&
        PAID_APPLY_LEAVE_TYPES.includes(r.type as PaidApplyLeaveType) &&
        (r.status === "Approved" || r.status === "Pending") &&
        r.from_date.startsWith(monthPrefix),
    )
    .reduce((sum, r) => sum + Number(r.days), 0);
}

export function monthlyPaidLeaveRemaining(
  requests: Pick<LeaveRequestRow, "type" | "days" | "from_date" | "status" | "employee_id">[],
  employeeId: string,
  refDate: string,
  excludeRequestId?: string,
): number {
  return Math.max(
    0,
    MONTHLY_PAID_LEAVE_CAP - monthlyPaidLeaveUsed(requests, employeeId, refDate, excludeRequestId),
  );
}

export type LeaveApplyResolution = {
  effectiveType: string;
  forcedUnpaid: boolean;
  unpaidReason: string | null;
  selectablePaidTypes: PaidApplyLeaveType[];
};

/** Decide whether paid leave is allowed or must fall back to Unpaid Leave. */
export function resolveLeaveApplication(input: {
  preferredType: string;
  days: number;
  employeeId: string;
  fromDate: string;
  balances: LeaveBalanceRow[];
  requests: Pick<LeaveRequestRow, "type" | "days" | "from_date" | "status" | "employee_id" | "id">[];
  excludeRequestId?: string;
}): LeaveApplyResolution {
  const { preferredType, days, employeeId, fromDate, balances, requests, excludeRequestId } = input;
  const monthUsed = monthlyPaidLeaveUsed(requests, employeeId, fromDate, excludeRequestId);
  const monthRemaining = MONTHLY_PAID_LEAVE_CAP - monthUsed;

  const selectablePaidTypes = PAID_APPLY_LEAVE_TYPES.filter((t) => {
    const bal = balanceForType(balances, t);
    const remaining = bal ? leaveBalanceRemaining(bal) : 0;
    return remaining >= days && monthUsed + days <= MONTHLY_PAID_LEAVE_CAP;
  });

  if (preferredType === UNPAID_LEAVE_TYPE) {
    return {
      effectiveType: UNPAID_LEAVE_TYPE,
      forcedUnpaid: false,
      unpaidReason: null,
      selectablePaidTypes,
    };
  }

  const preferredPaid = PAID_APPLY_LEAVE_TYPES.includes(preferredType as PaidApplyLeaveType);
  if (!preferredPaid) {
    return {
      effectiveType: UNPAID_LEAVE_TYPE,
      forcedUnpaid: true,
      unpaidReason: "Only Casual Leave or Sick Leave can be paid.",
      selectablePaidTypes,
    };
  }

  const bal = balanceForType(balances, preferredType);
  const balanceRemaining = bal ? leaveBalanceRemaining(bal) : 0;

  if (monthUsed + days > MONTHLY_PAID_LEAVE_CAP) {
    return {
      effectiveType: UNPAID_LEAVE_TYPE,
      forcedUnpaid: true,
      unpaidReason: `Monthly paid leave cap (${MONTHLY_PAID_LEAVE_CAP} days) reached — ${monthRemaining.toFixed(1)} day(s) left this month.`,
      selectablePaidTypes,
    };
  }

  if (balanceRemaining < days) {
    return {
      effectiveType: UNPAID_LEAVE_TYPE,
      forcedUnpaid: true,
      unpaidReason: `Insufficient ${preferredType} balance (${balanceRemaining.toFixed(1)} remaining).`,
      selectablePaidTypes,
    };
  }

  return {
    effectiveType: preferredType,
    forcedUnpaid: false,
    unpaidReason: null,
    selectablePaidTypes,
  };
}

/** Balances shown to employees — Casual and Sick only. */
export function displayLeaveBalances(balances: LeaveBalanceRow[]): LeaveBalanceRow[] {
  return PAID_APPLY_LEAVE_TYPES.map((type) => {
    const row = balanceForType(balances, type);
    return (
      row ?? {
        id: type,
        org_id: "",
        employee_id: "",
        policy_year: new Date().getFullYear(),
        type,
        entitled: type === "Sick Leave" ? 8 : 18,
        accrued: 0,
        taken: 0,
      }
    );
  });
}
