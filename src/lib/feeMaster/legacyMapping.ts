import type { FeePaymentStatus, FeePaymentStatusInput, FeeSubgroup } from "./enums";
import { FEE_PAYMENT_STATUSES, isFeePaymentStatus } from "./enums";
import type { FeeMasterLineItem } from "./lineItemContract";
import { feeMasterLineItemDraftSchema } from "./lineItemContract";

/** Generate a stable line_item_key when legacy rows omit one. */
export function generateLineItemKey(): string {
  return crypto.randomUUID();
}

/**
 * Normalize legacy fee payment status: NOT_REQUIRED → EXEMPT (P2.3 C5).
 * Passes through canonical values unchanged.
 */
export function normalizeFeePaymentStatus(
  status: FeePaymentStatusInput | null | undefined,
): FeePaymentStatus | undefined {
  if (status == null) return undefined;
  if (typeof status === "string" && status.trim() === "") return undefined;
  if (status === "NOT_REQUIRED") return "EXEMPT";
  if (isFeePaymentStatus(status)) return status;
  return undefined;
}

/**
 * Non-authoritative heuristic to infer fee_subgroup from legacy line text.
 * Prefer explicit fee_subgroup when present on the line.
 */
export function inferFeeSubgroupFromLegacy(line: FeeMasterLineItem): FeeSubgroup | undefined {
  if (line.fee_subgroup) return line.fee_subgroup;

  const haystack = `${line.service_name ?? ""} ${line.description ?? ""}`.toLowerCase();
  if (/government|govt|ircc|vfs|embassy|visa fee|biometric/.test(haystack)) {
    return "GOVERNMENT";
  }
  if (/tuition|application fee|deposit|gic|residence|university|college|institution/.test(haystack)) {
    return "INSTITUTION";
  }
  if (/ielts|pte|toefl|gre|gmat|sat|test prep/.test(haystack)) {
    return "TEST";
  }
  if (/wes|credential|evaluation|transcript/.test(haystack)) {
    return "CREDENTIAL";
  }
  if (/insurance|forex|sim|courier|medical|pcc/.test(haystack)) {
    return "ANCILLARY";
  }
  return undefined;
}

/**
 * Coerce loose JSONB invoice line into a fee-master line item.
 * Additive only — preserves all legacy keys via passthrough schema.
 */
export function normalizeLegacyLineItem(raw: unknown): FeeMasterLineItem {
  const parsed = feeMasterLineItemDraftSchema.parse(raw ?? {});
  const line_item_key = parsed.line_item_key ?? generateLineItemKey();
  const payment_status = normalizeFeePaymentStatus(parsed.payment_status);

  return {
    ...parsed,
    line_item_key,
    ...(payment_status !== undefined ? { payment_status } : {}),
  };
}

/**
 * Batch-normalize legacy line_items array from client_invoices JSONB.
 */
export function normalizeLegacyLineItems(raw: unknown): FeeMasterLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => normalizeLegacyLineItem(item));
}

/**
 * Returns true when status is EXEMPT or legacy NOT_REQUIRED (before normalize).
 */
export function isLegacyExemptStatus(status: unknown): boolean {
  return status === "EXEMPT" || status === "NOT_REQUIRED";
}

/**
 * Ensures legacy pricing fields are preserved on merge (identity passthrough for tests).
 */
export function mergeLegacyPricingFields(line: FeeMasterLineItem): FeeMasterLineItem {
  return { ...line };
}

/** All canonical fee payment statuses (excludes NOT_REQUIRED). */
export function allFeePaymentStatuses(): readonly FeePaymentStatus[] {
  return FEE_PAYMENT_STATUSES;
}
