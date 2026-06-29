/**
 * Settlement Engine — always requests eligibility from Commercial Agreement Engine.
 */
import { evaluateSettlementEligibility } from "../cae/commercialAgreementEngine";
import type { SettlementEligibilityDecision, SettlementEligibilityRequest } from "../cae/types";

export interface ProposedSettlement {
  settlementType: string;
  clientId: string;
  sourceModule: string;
  sourceRecordId: string;
  amount: number;
  currency?: string;
  asOfDate?: string;
  agreementId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SettlementCreationResult {
  created: boolean;
  blocked: boolean;
  decision: SettlementEligibilityDecision;
  settlement?: ProposedSettlement;
}

/**
 * Gate all settlement creation through CAE.
 * Returns created=false when status is not_eligible or override_pending.
 */
export async function requestSettlementFromCAE(
  settlement: ProposedSettlement,
): Promise<SettlementCreationResult> {
  const request: SettlementEligibilityRequest = {
    settlementType: settlement.settlementType,
    clientId: settlement.clientId,
    sourceModule: settlement.sourceModule,
    sourceRecordId: settlement.sourceRecordId,
    asOfDate: settlement.asOfDate,
    amount: settlement.amount,
    currency: settlement.currency,
    agreementId: settlement.agreementId,
    metadata: settlement.metadata,
  };

  const decision = await evaluateSettlementEligibility(request);

  if (!decision.eligible) {
    return { created: false, blocked: true, decision };
  }

  return { created: true, blocked: false, decision, settlement };
}

/** Batch helper for incentive runs — filters settlements that fail CAE. */
export async function filterSettlementsThroughCAE(
  settlements: ProposedSettlement[],
): Promise<{
  allowed: ProposedSettlement[];
  blocked: { settlement: ProposedSettlement; decision: SettlementEligibilityDecision }[];
}> {
  const allowed: ProposedSettlement[] = [];
  const blocked: { settlement: ProposedSettlement; decision: SettlementEligibilityDecision }[] = [];

  for (const s of settlements) {
    const result = await requestSettlementFromCAE(s);
    if (result.created && result.settlement) allowed.push(result.settlement);
    else blocked.push({ settlement: s, decision: result.decision });
  }

  return { allowed, blocked };
}
