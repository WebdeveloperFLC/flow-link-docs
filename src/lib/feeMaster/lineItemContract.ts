import { z } from "zod";
import {
  ACCOUNTING_TREATMENTS,
  BILLING_STAGES,
  COLLECTION_PATHS,
  FEE_MASTER_DOMAINS,
  FEE_PAYMENT_STATUSES,
  FEE_POLICY_DECISIONS,
  FEE_SUBGROUPS,
  FLC_SUBSIDY_SOURCES,
  PAYMENT_RESPONSIBILITIES,
  PRECEDENCE_LEVELS,
} from "./enums";

/** Zod schema for direct-paid proof object on a fee line. */
export const directPaidProofSchema = z.object({
  ref: z.string().min(1),
  paid_at: z.string().min(1),
  attachment_id: z.string().uuid().optional(),
});

/** Zod schema for fee_master_ref back-pointer. */
export const feeMasterRefSchema = z.object({
  domain: z.enum(FEE_MASTER_DOMAINS),
  source_id: z.string().min(1),
  precedence_level: z.enum(PRECEDENCE_LEVELS).optional(),
});

/** Zod schema for institution fee policy audit stub (ws-3). */
export const institutionFeePolicyAuditSchema = z
  .object({
    application_id: z.string().uuid().optional(),
    case_id: z.string().uuid().optional(),
    line_item_key: z.string().uuid().optional(),
    base_fee_amount: z.number().optional(),
    base_fee_currency: z.string().optional(),
    available_policy_id: z.string().uuid().nullable().optional(),
    policy_max_reduction: z.number().optional(),
    applied_fee_amount: z.number().optional(),
    difference_amount: z.number().optional(),
    fee_policy_decision: z.enum(FEE_POLICY_DECISIONS).optional(),
    flc_subsidy_source: z.enum(FLC_SUBSIDY_SOURCES).optional(),
    counselor_id: z.string().uuid().optional(),
    applied_at: z.string().optional(),
    reason: z.string().optional(),
  })
  .passthrough();

/** Permissive Zod schema for draft invoice line_items JSON (legacy keys preserved). */
export const feeMasterLineItemDraftSchema = z
  .object({
    line_item_key: z.string().uuid().optional(),
    service_id: z.string().nullable().optional(),
    service_code: z.string().nullable().optional(),
    service_name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    quantity: z.number().nullable().optional(),
    amount: z.number().nullable().optional(),
    discount: z.number().nullable().optional(),
    discount_mode: z.enum(["amount", "percentage"]).nullable().optional(),
    discount_value: z.number().nullable().optional(),
    checkout_discount_mode: z.enum(["amount", "percentage"]).nullable().optional(),
    checkout_discount_value: z.number().nullable().optional(),
    checkout_discount_applied: z.number().nullable().optional(),
    gst_basis: z.enum(["after_discount", "before_discount"]).nullable().optional(),
    tax: z.number().nullable().optional(),
    gst_rate: z.number().nullable().optional(),
    total: z.number().nullable().optional(),
    currency: z.string().nullable().optional(),
    billing_stage: z.enum(BILLING_STAGES).nullable().optional(),
    case_id: z.string().uuid().nullable().optional(),
    collection_category_id: z.string().uuid().nullable().optional(),
    payment_responsibility: z.enum(PAYMENT_RESPONSIBILITIES).optional(),
    payment_status: z
      .enum([...FEE_PAYMENT_STATUSES, "NOT_REQUIRED"] as const)
      .optional(),
    collection_path: z.enum(COLLECTION_PATHS).optional(),
    fee_subgroup: z.enum(FEE_SUBGROUPS).optional(),
    accounting_treatment: z.enum(ACCOUNTING_TREATMENTS).optional(),
    billable_amount: z.number().optional(),
    tracked_amount: z.number().optional(),
    fee_master_ref: feeMasterRefSchema.optional(),
    direct_paid_proof: directPaidProofSchema.optional(),
    payer_party_ref: z.string().optional(),
    institution_fee_reference: z.number().optional(),
    institution_fee_applied: z.number().optional(),
    institution_fee_policy_audit: institutionFeePolicyAuditSchema.optional(),
  })
  .passthrough();

const feeMasterLineItemSendBaseSchema = feeMasterLineItemDraftSchema.extend({
  line_item_key: z.string().uuid(),
});

/**
 * Strict send-gate schema — REVENUE lines relax fee payment fields;
 * pass-through lines require responsibility, status, and collection path.
 */
export const feeMasterLineItemSendSchema = feeMasterLineItemSendBaseSchema.superRefine(
  (line, ctx) => {
    const treatment = line.accounting_treatment ?? "REVENUE";
    const isRevenue = treatment === "REVENUE";

    if (isRevenue) return;

    if (!line.payment_responsibility) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "payment_responsibility is required on pass-through lines before send",
        path: ["payment_responsibility"],
      });
    }
    if (!line.payment_status) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "payment_status is required on pass-through lines before send",
        path: ["payment_status"],
      });
    }
    if (!line.collection_path) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "collection_path is required on pass-through lines before send",
        path: ["collection_path"],
      });
    }

    if (line.payment_status === "EXEMPT" && line.direct_paid_proof) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "EXEMPT lines must not include direct_paid_proof",
        path: ["direct_paid_proof"],
      });
    }

    if (
      line.collection_path === "CLIENT_DIRECT" &&
      line.payment_status === "PAID_BY_CLIENT" &&
      !line.direct_paid_proof
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "direct_paid_proof is required when CLIENT_DIRECT and PAID_BY_CLIENT",
        path: ["direct_paid_proof"],
      });
    }

    if (line.billable_amount === undefined && line.tracked_amount === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "billable_amount or tracked_amount is required before send",
        path: ["billable_amount"],
      });
    }
  },
);

export type DirectPaidProof = z.infer<typeof directPaidProofSchema>;
/** Back-pointer to authoritative fee master row. */
export type FeeMasterRef = z.infer<typeof feeMasterRefSchema>;
/** Institution fee policy application audit payload (ws-3). */
export type InstitutionFeePolicyAudit = z.infer<typeof institutionFeePolicyAuditSchema>;
/** Fee-master line item on client_invoices.line_items JSONB. */
export type FeeMasterLineItem = z.infer<typeof feeMasterLineItemDraftSchema>;

/**
 * Parse unknown JSONB into a draft fee-master line item (permissive).
 */
export function parseFeeMasterLineItemDraft(raw: unknown): FeeMasterLineItem {
  return feeMasterLineItemDraftSchema.parse(raw);
}

/**
 * Safe parse for draft line items — returns Zod result without throwing.
 */
export function safeParseFeeMasterLineItemDraft(raw: unknown) {
  return feeMasterLineItemDraftSchema.safeParse(raw);
}

/**
 * Parse a line item against send-gate rules (strict for pass-through lines).
 */
export function parseFeeMasterLineItemForSend(raw: unknown): FeeMasterLineItem {
  return feeMasterLineItemSendSchema.parse(raw);
}

/**
 * Safe parse for send-gate validation.
 */
export function safeParseFeeMasterLineItemForSend(raw: unknown) {
  return feeMasterLineItemSendSchema.safeParse(raw);
}
