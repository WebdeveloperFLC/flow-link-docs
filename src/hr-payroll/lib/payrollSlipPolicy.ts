/** Payslips are only issued after payroll is frozen or disbursed. */
export function isPayrollSlipCycle(status: string | null | undefined): boolean {
  return status === "Locked" || status === "Paid";
}
