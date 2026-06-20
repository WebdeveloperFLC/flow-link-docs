/**
 * Phase 1.1 — Service billing cap, deposit/installment stages, billing intent.
 * billing_stage is always line-level (stored on invoice line_items JSON).
 */

export type BillingStage = "DEPOSIT" | "INSTALLMENT" | "BALANCE" | "TOP_UP" | "FULL";

export type BillingTrigger =
  | "DEPOSIT"
  | "POST_OFFER"
  | "POST_VISA"
  | "POST_ENROLLMENT"
  | "PRE_DEPARTURE"
  | "ON_ADMISSION"
  | "OTHER";

export type BillingIntentKind =
  | "none"
  | "new_service"
  | "deposit_invoice"
  | "first_invoice"
  | "additional_installment"
  | "balance_invoice"
  | "top_up"
  | "duplicate_draft"
  | "duplicate_service"
  | "outstanding_collect_first";

export interface BillingIntentCheck {
  kind: BillingIntentKind;
  billingStage: BillingStage | null;
  serviceCode: string;
  serviceName: string;
  caseId?: string;
  draftInvoiceId?: string;
  draftInvoiceNumber?: string;
  message: string;
  requestedAmount: number | null;
  invoicedBefore: number;
  remainingBillable: number | null;
  proposedLineTotal: number;
}

export interface ServiceBillingProfile {
  caseId: string;
  serviceCode: string;
  requestedAmount: number | null;
  requestedCurrency: string | null;
  institutionRequiredDeposit: number | null;
  billingTrigger: BillingTrigger | null;
  institutionDepositReference: string | null;
  invoicedAmount: number;
  collectedAmount: number;
  outstandingAr: number;
  remainingBillable: number | null;
}

const TOLERANCE = 0.01;

export function billingStageLabel(stage: BillingStage | string | null | undefined): string {
  switch (stage) {
    case "DEPOSIT":
      return "Deposit";
    case "INSTALLMENT":
      return "Installment";
    case "BALANCE":
      return "Balance";
    case "TOP_UP":
      return "Top-up";
    case "FULL":
      return "Full";
    default:
      return stage ? String(stage) : "—";
  }
}

export function billingTriggerLabel(t: BillingTrigger | string | null | undefined): string {
  switch (t) {
    case "DEPOSIT":
      return "Deposit";
    case "POST_OFFER":
      return "Post-offer";
    case "POST_VISA":
      return "Post-visa";
    case "POST_ENROLLMENT":
      return "Post-enrollment";
    case "PRE_DEPARTURE":
      return "Pre-departure";
    case "ON_ADMISSION":
      return "On admission";
    case "OTHER":
      return "Other";
    default:
      return t ? String(t) : "—";
  }
}

/** Classify line-level billing_stage (never invoice-level). */
export function classifyBillingStage(params: {
  invoicedBefore: number;
  proposedLineTotal: number;
  requestedAmount: number | null;
  remainingBillable: number | null;
  isCapOverride?: boolean;
}): BillingStage {
  const { invoicedBefore, proposedLineTotal, requestedAmount, remainingBillable, isCapOverride } = params;
  if (isCapOverride) return "TOP_UP";
  if (requestedAmount != null && invoicedBefore <= TOLERANCE && proposedLineTotal >= requestedAmount - TOLERANCE) {
    return "FULL";
  }
  if (invoicedBefore <= TOLERANCE && requestedAmount != null && proposedLineTotal < requestedAmount - TOLERANCE) {
    return "DEPOSIT";
  }
  if (remainingBillable != null && proposedLineTotal >= remainingBillable - TOLERANCE && invoicedBefore > TOLERANCE) {
    return "BALANCE";
  }
  if (invoicedBefore > TOLERANCE) return "INSTALLMENT";
  if (requestedAmount != null && proposedLineTotal >= requestedAmount - TOLERANCE) return "FULL";
  return "INSTALLMENT";
}

export function resolveBillingIntent(params: {
  serviceCode: string;
  serviceName: string;
  caseId?: string | null;
  requestedAmount: number | null;
  invoicedBefore: number;
  remainingBillable: number | null;
  proposedLineTotal: number;
  alreadyEnrolled?: boolean;
  hasDraft?: boolean;
  draftInvoiceId?: string;
  draftInvoiceNumber?: string;
  hasOutstandingSent?: boolean;
  outstandingAmount?: number;
}): BillingIntentCheck {
  const base = {
    serviceCode: params.serviceCode,
    serviceName: params.serviceName,
    caseId: params.caseId ?? undefined,
    requestedAmount: params.requestedAmount,
    invoicedBefore: params.invoicedBefore,
    remainingBillable: params.remainingBillable,
    proposedLineTotal: params.proposedLineTotal,
  };

  if (params.hasDraft && params.draftInvoiceId) {
    return {
      ...base,
      kind: "duplicate_draft",
      billingStage: null,
      draftInvoiceId: params.draftInvoiceId,
      draftInvoiceNumber: params.draftInvoiceNumber,
      message: `Draft invoice ${params.draftInvoiceNumber ?? ""} already includes this service.`,
    };
  }

  const stage = classifyBillingStage({
    invoicedBefore: params.invoicedBefore,
    proposedLineTotal: params.proposedLineTotal,
    requestedAmount: params.requestedAmount,
    remainingBillable: params.remainingBillable,
  });

  if (
    params.requestedAmount != null &&
    params.invoicedBefore + params.proposedLineTotal > params.requestedAmount + TOLERANCE
  ) {
    return {
      ...base,
      kind: "top_up",
      billingStage: "TOP_UP",
      message: `Exceeds remaining billable (${Math.max((params.remainingBillable ?? 0), 0).toFixed(2)}). Increase requested amount or Finance override.`,
    };
  }

  if (params.invoicedBefore <= TOLERANCE && params.proposedLineTotal > TOLERANCE) {
    if (
      params.requestedAmount != null &&
      params.proposedLineTotal < params.requestedAmount - TOLERANCE
    ) {
      return {
        ...base,
        kind: "deposit_invoice",
        billingStage: "DEPOSIT",
        message: `Deposit invoice — ${params.proposedLineTotal.toFixed(2)} of ${params.requestedAmount.toFixed(2)} requested.`,
      };
    }
    return {
      ...base,
      kind: "first_invoice",
      billingStage: stage,
      message: `First invoice for ${params.serviceName}.`,
    };
  }

  if (stage === "BALANCE") {
    return {
      ...base,
      kind: "balance_invoice",
      billingStage: "BALANCE",
      message: `Balance invoice — closes remaining billable (${(params.remainingBillable ?? 0).toFixed(2)}).`,
    };
  }

  if (params.hasOutstandingSent && (params.outstandingAmount ?? 0) > TOLERANCE) {
    return {
      ...base,
      kind: "outstanding_collect_first",
      billingStage: stage,
      message: `Outstanding AR ${(params.outstandingAmount ?? 0).toFixed(2)} on a prior invoice — collect or proceed with installment.`,
    };
  }

  if (params.invoicedBefore > TOLERANCE) {
    return {
      ...base,
      kind: "additional_installment",
      billingStage: "INSTALLMENT",
      message: `Installment invoice — ${params.proposedLineTotal.toFixed(2)} of ${(params.remainingBillable ?? 0).toFixed(2)} remaining billable.`,
    };
  }

  if (params.alreadyEnrolled) {
    return {
      ...base,
      kind: "duplicate_service",
      billingStage: null,
      message: `"${params.serviceName}" is already on this student. Use the existing service request.`,
    };
  }

  return { ...base, kind: "none", billingStage: stage, message: "" };
}

export function validateBillingCap(params: {
  requestedAmount: number | null;
  invoicedBefore: number;
  proposedLineTotal: number;
  allowOverride?: boolean;
}): { ok: boolean; remainingBillable: number | null; error?: string } {
  const { requestedAmount, invoicedBefore, proposedLineTotal, allowOverride } = params;
  if (requestedAmount == null) {
    return { ok: true, remainingBillable: null };
  }
  const remaining = Math.max(requestedAmount - invoicedBefore, 0);
  if (invoicedBefore + proposedLineTotal > requestedAmount + TOLERANCE && !allowOverride) {
    return {
      ok: false,
      remainingBillable: remaining,
      error: `Exceeds remaining billable (${remaining.toFixed(2)}). Finance override required.`,
    };
  }
  return {
    ok: true,
    remainingBillable: Math.max(requestedAmount - invoicedBefore - proposedLineTotal, 0),
  };
}

export const BILLING_TRIGGER_OPTIONS: { value: BillingTrigger; label: string }[] = [
  { value: "DEPOSIT", label: "Deposit" },
  { value: "POST_OFFER", label: "Post-offer" },
  { value: "POST_VISA", label: "Post-visa" },
  { value: "POST_ENROLLMENT", label: "Post-enrollment" },
  { value: "PRE_DEPARTURE", label: "Pre-departure" },
  { value: "ON_ADMISSION", label: "On admission" },
  { value: "OTHER", label: "Other" },
];
