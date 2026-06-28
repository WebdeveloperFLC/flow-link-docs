import type { HrRole } from "./constants";
import type { PayrollCycleRow } from "./types";

const UAT_RESET_STATUSES = new Set(["Processed", "Approved", "Locked", "Paid"]);

export function isPayrollCycleUatResetEligible(
  cycle: Pick<PayrollCycleRow, "status" | "is_production"> | null | undefined,
): boolean {
  if (!cycle) return false;
  if (cycle.is_production) return false;
  return UAT_RESET_STATUSES.has(cycle.status);
}

export function canUserResetPayrollCycleUat(input: {
  role: HrRole | null;
  canConfigure: boolean;
  canApprove: boolean;
}): boolean {
  const { role, canConfigure, canApprove } = input;
  if (!role) return false;
  if ((role === "Admin" || role === "Super Admin") && canConfigure) return true;
  if (role === "HR Manager" && canApprove) return true;
  return false;
}

export function canResetPayrollCycleUat(input: {
  cycle: Pick<PayrollCycleRow, "status" | "is_production"> | null | undefined;
  hasSelectedCycle: boolean;
  role: HrRole | null;
  canConfigure: boolean;
  canApprove: boolean;
}): boolean {
  return (
    input.hasSelectedCycle &&
    isPayrollCycleUatResetEligible(input.cycle) &&
    canUserResetPayrollCycleUat(input)
  );
}
