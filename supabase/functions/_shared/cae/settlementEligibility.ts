/**
 * CAE ownership rules — shared between edge functions and app (pure logic).
 */
export type OwnershipBlockReason =
  | "existing_customer_prior_payment"
  | "continuing_relationship"
  | "active_commercial_agreement"
  | "referral_existing_client"
  | "duplicate_referral"
  | "ownership_conflict"
  | "assigned_to_future_link";

export type Snapshot = {
  clientId: string;
  hasPriorVerifiedPayment?: boolean;
  hasPriorVerifiedPaymentBeforeEvent?: boolean;
  hasActiveCommissionAgreement?: boolean;
  referralPredatesClient?: boolean;
  duplicateReferralSignal?: boolean;
  assignedCounselorId?: string | null;
  ownerId?: string | null;
  closingCounselorId?: string | null;
};

const PROTECTED = new Set([
  "incentive_counselor",
  "incentive_line_item",
  "referral_bonus",
  "referral_points",
  "commission_partner",
  "acquisition_bonus",
  "revenue_share",
  "partner_fee",
]);

export function evaluateOwnershipPure(
  settlementType: string,
  snapshot: Snapshot,
): { eligible: boolean; reasons: OwnershipBlockReason[] } {
  if (!PROTECTED.has(settlementType)) {
    return { eligible: true, reasons: [] };
  }

  const reasons: OwnershipBlockReason[] = [];

  if (snapshot.hasPriorVerifiedPayment) {
    reasons.push("existing_customer_prior_payment");
  }
  if (snapshot.hasPriorVerifiedPaymentBeforeEvent) {
    reasons.push("continuing_relationship");
  }
  if (snapshot.hasActiveCommissionAgreement) {
    reasons.push("active_commercial_agreement");
  }
  if (
    settlementType.startsWith("referral") &&
    (snapshot.referralPredatesClient || snapshot.hasPriorVerifiedPayment)
  ) {
    reasons.push("referral_existing_client");
  }
  if (snapshot.duplicateReferralSignal) {
    reasons.push("duplicate_referral");
    reasons.push("ownership_conflict");
  }
  if (
    (snapshot.assignedCounselorId || snapshot.ownerId || snapshot.closingCounselorId) &&
    (settlementType === "referral_bonus" ||
      settlementType === "referral_points" ||
      settlementType === "acquisition_bonus" ||
      settlementType === "partner_fee")
  ) {
    reasons.push("assigned_to_future_link");
  }

  const unique = [...new Set(reasons)];
  return { eligible: unique.length === 0, reasons: unique };
}

export async function evaluateSettlementViaRpc(
  svc: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> },
  input: {
    settlementType: string;
    clientId: string;
    sourceModule: string;
    sourceRecordId: string;
    asOfDate?: string;
  },
): Promise<{ eligible: boolean; status: string; reasons: string[] }> {
  const { data, error } = await svc.rpc("fn_cae_evaluate_settlement_eligibility", {
    p_settlement_type: input.settlementType,
    p_client_id: input.clientId,
    p_source_module: input.sourceModule,
    p_source_record_id: input.sourceRecordId,
    p_as_of: input.asOfDate ?? new Date().toISOString(),
  });

  if (error || !data) {
    const snap: Snapshot = { clientId: input.clientId };
    const pure = evaluateOwnershipPure(input.settlementType, snap);
    return {
      eligible: pure.eligible,
      status: pure.eligible ? "eligible" : "not_eligible",
      reasons: pure.reasons,
    };
  }

  const row = data as { eligible?: boolean; status?: string; reasons?: string[] };
  return {
    eligible: !!row.eligible,
    status: String(row.status ?? (row.eligible ? "eligible" : "not_eligible")),
    reasons: (row.reasons ?? []) as string[],
  };
}
