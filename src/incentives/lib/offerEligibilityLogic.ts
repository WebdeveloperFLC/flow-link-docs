export type EligibilityAudience =
  | "new_lead"
  | "new_client"
  | "existing"
  | "re_enrolled"
  | string;

export interface OfferEligibilityRuleRow {
  id: string;
  offerId: string | null;
  offerTitle: string;
  audience: EligibilityAudience;
  audienceLabel: string;
  blockIfActiveService: boolean;
  scopeServiceCode: string | null;
  scopeCountryTag: string | null;
  scopeMasterKey: string | null;
  evaluateAgainst: string[];
  isActive: boolean;
  notes: string | null;
}

export interface OfferConflictSummary {
  stackableOffers: number;
  highPriorityOffers: number;
  globalRules: number;
  offerSpecificRules: number;
}

export const ELIGIBILITY_AUDIENCES: { id: EligibilityAudience; label: string }[] = [
  { id: "existing", label: "Existing client" },
  { id: "new_client", label: "New client" },
  { id: "new_lead", label: "New lead" },
  { id: "re_enrolled", label: "Re-enrolled" },
];

export function audienceLabel(audience: string): string {
  return ELIGIBILITY_AUDIENCES.find((a) => a.id === audience)?.label ?? audience.replace(/_/g, " ");
}

export function buildEligibilityRuleRow(input: {
  id: string;
  offer_id: string | null;
  audience: string;
  block_if_active_service: boolean;
  scope_service_code: string | null;
  scope_country_tag: string | null;
  scope_master_key: string | null;
  evaluate_against: string[] | null;
  is_active: boolean;
  notes: string | null;
  offerTitle?: string;
}): OfferEligibilityRuleRow {
  return {
    id: input.id,
    offerId: input.offer_id,
    offerTitle: input.offerTitle ?? (input.offer_id ? "Linked offer" : "Global policy"),
    audience: input.audience,
    audienceLabel: audienceLabel(input.audience),
    blockIfActiveService: input.block_if_active_service,
    scopeServiceCode: input.scope_service_code,
    scopeCountryTag: input.scope_country_tag,
    scopeMasterKey: input.scope_master_key,
    evaluateAgainst: input.evaluate_against ?? ["enrollments", "invoices", "payments"],
    isActive: input.is_active,
    notes: input.notes,
  };
}

export function offerConflictSummary(input: {
  offers: { stackable?: boolean | null; priority?: number | null }[];
  rules: OfferEligibilityRuleRow[];
}): OfferConflictSummary {
  return {
    stackableOffers: input.offers.filter((o) => o.stackable).length,
    highPriorityOffers: input.offers.filter((o) => (o.priority ?? 0) > 0).length,
    globalRules: input.rules.filter((r) => !r.offerId && r.isActive).length,
    offerSpecificRules: input.rules.filter((r) => r.offerId && r.isActive).length,
  };
}

export function ruleScopeSummary(rule: OfferEligibilityRuleRow): string {
  const parts: string[] = [];
  if (rule.scopeServiceCode) parts.push(`Service: ${rule.scopeServiceCode}`);
  if (rule.scopeCountryTag) parts.push(`Country: ${rule.scopeCountryTag}`);
  if (rule.scopeMasterKey) parts.push(`Master: ${rule.scopeMasterKey}`);
  return parts.length ? parts.join(" · ") : "All scopes";
}
