import type {
  AccountingTreatment,
  FeePaymentStatus,
  FeeSubgroup,
} from "./enums";
import { inferFeeSubgroupFromLegacy } from "./legacyMapping";
import type { FeeMasterLineItem } from "./lineItemContract";

/** CAD 10 equivalent cap for direct-paid tolerance (P2.3 C4 / MD-G1). */
export const DIRECT_PAID_TOLERANCE_CAD_CAP = 10;

/**
 * Compute allowed variance for direct-paid amount vs master:
 * `min(master × 5%, CAD 10 equivalent in client currency)`.
 *
 * @param masterAmount - Authoritative master rate in client currency
 * @param fxToCad - Multiply client currency amount by this to get CAD equivalent (must be > 0)
 */
export function directPaidTolerance(
  masterAmount: number,
  fxToCad: number,
): number {
  if (masterAmount <= 0 || fxToCad <= 0) return 0;
  const percentTolerance = masterAmount * 0.05;
  const cadCapInClientCurrency = DIRECT_PAID_TOLERANCE_CAD_CAP / fxToCad;
  return Math.min(percentTolerance, cadCapInClientCurrency);
}

/**
 * Returns true when recorded amount is within C4 tolerance of master amount.
 */
export function isWithinDirectPaidTolerance(
  masterAmount: number,
  recordedAmount: number,
  fxToCad: number,
): boolean {
  const tolerance = directPaidTolerance(masterAmount, fxToCad);
  return Math.abs(recordedAmount - masterAmount) <= tolerance;
}

/**
 * Returns true when fee line payment_status is EXEMPT (never applicable).
 */
export function isFeeLineExempt(line: Pick<FeeMasterLineItem, "payment_status">): boolean {
  return line.payment_status === "EXEMPT";
}

/**
 * Returns true when fee line payment_status is WAIVED (obligation removed).
 */
export function isFeeLineWaived(line: Pick<FeeMasterLineItem, "payment_status">): boolean {
  return line.payment_status === "WAIVED";
}

/**
 * Returns an error when status conflates EXEMPT and WAIVED semantics on one line.
 */
export function validateExemptWaivedDistinction(
  line: Pick<FeeMasterLineItem, "payment_status">,
): string | undefined {
  if (line.payment_status === "EXEMPT" && isFeeLineWaived(line)) {
    return "EXEMPT and WAIVED are mutually exclusive";
  }
  return undefined;
}

/**
 * Derive billable_amount and tracked_amount from legacy total/amount fields.
 */
export function defaultBillableAndTracked(
  line: Pick<FeeMasterLineItem, "total" | "amount" | "billable_amount" | "tracked_amount">,
): { billable_amount: number; tracked_amount: number } {
  const economic = line.total ?? line.amount ?? 0;
  return {
    billable_amount: line.billable_amount ?? economic,
    tracked_amount: line.tracked_amount ?? economic,
  };
}

/**
 * Pass-through lines require fee payment fields on send; revenue lines do not.
 */
export function isPassThroughLine(
  line: Pick<FeeMasterLineItem, "accounting_treatment">,
): boolean {
  return (line.accounting_treatment ?? "REVENUE") !== "REVENUE";
}

/**
 * Map fee_subgroup to default accounting_treatment when not explicitly set.
 */
export function deriveAccountingTreatment(
  feeSubgroup: FeeSubgroup | undefined,
): AccountingTreatment {
  switch (feeSubgroup) {
    case "GOVERNMENT":
    case "ANCILLARY":
    case "TEST":
    case "CREDENTIAL":
      return "THIRD_PARTY";
    case "INSTITUTION":
      return "INSTITUTION_RELATED";
    default:
      return "REVENUE";
  }
}

/**
 * Apply default billable/tracked amounts and derived accounting_treatment to a line.
 */
export function enrichLineDefaults(line: FeeMasterLineItem): FeeMasterLineItem {
  const amounts = defaultBillableAndTracked(line);
  const fee_subgroup = line.fee_subgroup ?? inferFeeSubgroupFromLegacy(line);
  const accounting_treatment =
    line.accounting_treatment ?? deriveAccountingTreatment(fee_subgroup);

  return {
    ...line,
    ...amounts,
    ...(fee_subgroup ? { fee_subgroup } : {}),
    accounting_treatment,
  };
}

/**
 * Returns true when two statuses represent distinct EXEMPT vs WAIVED semantics.
 */
export function areExemptAndWaivedDistinct(
  a: FeePaymentStatus,
  b: FeePaymentStatus,
): boolean {
  if (a === "EXEMPT" && b === "WAIVED") return true;
  if (a === "WAIVED" && b === "EXEMPT") return true;
  return a !== b;
}
