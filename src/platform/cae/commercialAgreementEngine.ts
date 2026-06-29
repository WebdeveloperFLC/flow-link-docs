/**
 * Commercial Agreement Engine (CAE).
 * Enterprise source of truth for commercial relationships + customer ownership protection.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  COMMERCIAL_AGREEMENT_CONFIG_KEY,
  DEFAULT_COMMERCIAL_AGREEMENT_CONFIG,
} from "./defaultCommercialAgreementConfig";
import { evaluateCustomerOwnershipRules } from "./customerOwnershipRules";
import { resolveAgreementVersionAtDate } from "./commercialAgreementRegistry";
import type {
  CommercialAgreementConfig,
  CustomerOwnershipSnapshot,
  SettlementEligibilityDecision,
  SettlementEligibilityRequest,
  SettlementEligibilityStatus,
} from "./types";
import { getCachedConfig } from "../config/platformConfigService";
import { createBusinessEvent } from "../foe/businessEventService";

let configCache: CommercialAgreementConfig | null = null;

function mergeConfig(partial?: Partial<CommercialAgreementConfig>): CommercialAgreementConfig {
  return { ...DEFAULT_COMMERCIAL_AGREEMENT_CONFIG, ...partial };
}

export function getCommercialAgreementConfig(): CommercialAgreementConfig {
  if (configCache) return configCache;
  const fromPlatform = getCachedConfig(COMMERCIAL_AGREEMENT_CONFIG_KEY as never) as
    | Partial<CommercialAgreementConfig>
    | undefined;
  if (fromPlatform && Object.keys(fromPlatform).length) {
    configCache = mergeConfig(fromPlatform);
    return configCache;
  }
  return DEFAULT_COMMERCIAL_AGREEMENT_CONFIG;
}

export function invalidateCommercialAgreementConfigCache(): void {
  configCache = null;
}

export async function loadCustomerOwnershipSnapshot(input: {
  clientId: string;
  asOfDate?: string;
  sourceRecordId?: string;
  claimantCounselorId?: string | null;
}): Promise<CustomerOwnershipSnapshot> {
  const asOf = input.asOfDate ?? new Date().toISOString();

  const [
    clientRes,
    priorPayRes,
    priorBeforeRes,
    programRes,
    commissionRes,
    referralRes,
    dupReferralRes,
    activeCaeAgreementsRes,
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, created_at, owner_id, assigned_counselor_id, closing_counselor_id")
      .eq("id", input.clientId)
      .maybeSingle(),
    supabase
      .from("client_invoice_payments")
      .select("id")
      .eq("client_id", input.clientId)
      .or("payment_status.eq.verified,payment_proof_status.eq.verified")
      .is("archived_at", null)
      .neq("is_refund", true)
      .limit(1),
    supabase
      .from("client_invoice_payments")
      .select("id")
      .eq("client_id", input.clientId)
      .lt("paid_at", asOf)
      .or("payment_status.eq.verified,payment_proof_status.eq.verified")
      .is("archived_at", null)
      .neq("is_refund", true)
      .limit(1),
    supabase.from("cf_client_programs").select("id").eq("client_id", input.clientId).limit(1),
    supabase
      .from("upi_commission_students")
      .select("id, agreement_id")
      .eq("client_id", input.clientId)
      .not("agreement_id", "is", null)
      .limit(1),
    input.sourceRecordId
      ? supabase
          .from("referrals")
          .select("id, created_at, joined_client_id, referrer_client_id, friend_email, friend_phone")
          .eq("id", input.sourceRecordId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("joined_client_id", input.clientId),
    supabase
      .from("commercial_agreement_parties" as never)
      .select("agreement_id", { count: "exact", head: true })
      .eq("financial_party_id", input.clientId as never),
  ]);

  const client = clientRes.data as Record<string, unknown> | null;
  const referral = referralRes.data as Record<string, unknown> | null;

  let referralPredatesClient = false;
  let selfReferralSignal = false;
  if (referral && client?.created_at) {
    const refAt = String(referral.created_at ?? "");
    const clientAt = String(client.created_at);
    if (referral.joined_client_id && refAt > clientAt) {
      referralPredatesClient = true;
    }
    if (referral.referrer_client_id === referral.joined_client_id) {
      selfReferralSignal = true;
    }
  }

  const assignedCounselorId = (client?.assigned_counselor_id as string) ?? null;
  const claimantId = input.claimantCounselorId ?? null;
  const counselorOwnStudentSignal =
    !!claimantId &&
    (claimantId === assignedCounselorId ||
      claimantId === (client?.owner_id as string) ||
      claimantId === (client?.closing_counselor_id as string));

  const dupCount = (dupReferralRes as { count?: number }).count ?? 0;
  const duplicateReferralSignal = dupCount > 1;
  const multipleReferralClaimsSignal = dupCount > 1;

  return {
    clientId: input.clientId,
    clientCreatedAt: (client?.created_at as string) ?? null,
    hasPriorVerifiedPayment: (priorPayRes.data ?? []).length > 0,
    hasPriorVerifiedPaymentBeforeEvent: (priorBeforeRes.data ?? []).length > 0,
    hasCrmRecord: !!client,
    assignedCounselorId,
    ownerId: (client?.owner_id as string) ?? null,
    closingCounselorId: (client?.closing_counselor_id as string) ?? null,
    hasActiveProgram: (programRes.data ?? []).length > 0,
    hasActiveCommissionAgreement: (commissionRes.data ?? []).length > 0,
    referralPredatesClient,
    duplicateReferralSignal,
    selfReferralSignal,
    multipleReferralClaimsSignal,
    counselorOwnStudentSignal,
    duplicateAgreementSignal: ((activeCaeAgreementsRes as { count?: number }).count ?? 0) > 1,
    claimantCounselorId: claimantId,
  };
}

async function loadApprovedOverride(
  request: SettlementEligibilityRequest,
): Promise<SettlementEligibilityStatus | null> {
  try {
    const { data } = await supabase
      .from("cae_override_requests" as never)
      .select("status")
      .eq("client_id", request.clientId)
      .eq("source_module", request.sourceModule)
      .eq("source_record_id", request.sourceRecordId)
      .eq("settlement_type", request.settlementType)
      .in("status", ["approved", "released"] as never)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if ((data as { status?: string } | null)?.status) return "override_approved";
  } catch {
    /* table pending */
  }
  try {
    const { data: pending } = await supabase
      .from("cae_override_requests" as never)
      .select("status")
      .eq("client_id", request.clientId)
      .eq("source_module", request.sourceModule)
      .eq("source_record_id", request.sourceRecordId)
      .eq("settlement_type", request.settlementType)
      .eq("status", "pending" as never)
      .limit(1)
      .maybeSingle();
    if (pending) return "override_pending";
  } catch {
    /* optional */
  }
  return null;
}

async function persistEligibilityDecision(
  request: SettlementEligibilityRequest,
  decision: SettlementEligibilityDecision,
): Promise<string | null> {
  let businessEventId: string | null = null;
  try {
    const event = await createBusinessEvent({
      domain: "generic",
      eventType: decision.eligible ? "cae_settlement_eligible" : "cae_settlement_blocked",
      sourceModule: request.sourceModule,
      sourceRecordId: request.sourceRecordId,
      metadata: {
        client_id: request.clientId,
        settlement_type: request.settlementType,
        status: decision.status,
        reasons: decision.reasons,
        fraud_reasons: decision.fraudReasons,
        agreement_id: request.agreementId,
        agreement_version_id: request.agreementVersionId,
      },
    });
    businessEventId = event.id;
    decision.businessEventId = event.id;
  } catch {
    /* best-effort */
  }

  try {
    const { data } = await supabase
      .from("cae_eligibility_decisions" as never)
      .insert({
        client_id: request.clientId,
        settlement_type: request.settlementType,
        source_module: request.sourceModule,
        source_record_id: request.sourceRecordId,
        status: decision.status,
        reasons: [...decision.reasons, ...decision.fraudReasons],
        ownership_snapshot: decision.ownershipSnapshot ?? {},
        business_event_id: businessEventId,
        financial_party_id: request.financialPartyId ?? null,
        agreement_id: request.agreementId ?? null,
        agreement_version_id: request.agreementVersionId ?? null,
      } as never)
      .select("id")
      .maybeSingle();
    return (data as { id?: string } | null)?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve agreement version at event date (after ownership gate passes).
 * Ownership evaluation always runs first — constitutional precedence.
 */
export async function resolveAgreementForSettlement(input: {
  agreementId: string;
  asOfDate?: string;
}): Promise<{ versionId: string | null }> {
  const version = await resolveAgreementVersionAtDate(input.agreementId, input.asOfDate);
  return { versionId: version?.id ?? null };
}

/** Primary CAE API — Settlement Engine must call this before creating settlements. */
export async function evaluateSettlementEligibility(
  request: SettlementEligibilityRequest,
  opts?: { persist?: boolean; skipDbSnapshot?: boolean },
): Promise<SettlementEligibilityDecision> {
  const config = getCommercialAgreementConfig();
  const overrideStatus = await loadApprovedOverride(request);

  const snapshot = opts?.skipDbSnapshot
    ? ({ clientId: request.clientId, hasCrmRecord: true } as CustomerOwnershipSnapshot)
    : await loadCustomerOwnershipSnapshot({
        clientId: request.clientId,
        asOfDate: request.asOfDate,
        sourceRecordId: request.sourceRecordId,
        claimantCounselorId: request.claimantCounselorId,
      });

  // Step 1: Ownership + fraud (constitutional — cannot be skipped)
  const decision = evaluateCustomerOwnershipRules(request, snapshot, config, {
    overrideStatus: overrideStatus ?? undefined,
  });

  // Step 2: Agreement version resolution (only when eligible and agreement provided)
  if (decision.eligible && request.agreementId && !request.agreementVersionId) {
    const resolved = await resolveAgreementForSettlement({
      agreementId: request.agreementId,
      asOfDate: request.asOfDate?.slice(0, 10),
    });
    decision.agreementVersionId = resolved.versionId;
    request.agreementVersionId = resolved.versionId;
  }

  if (opts?.persist !== false) {
    const decisionId = await persistEligibilityDecision(request, decision);
    decision.decisionId = decisionId;
  }

  return decision;
}

export { evaluateCustomerOwnershipRules };
